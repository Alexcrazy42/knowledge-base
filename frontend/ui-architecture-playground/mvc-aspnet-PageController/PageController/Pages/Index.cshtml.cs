using BoardApp.Core;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace PageController.Pages;

// ============================================================================
// INDEX - главная страница приложения: канбан-доска ИЛИ список задач.
//
// ПАТТЕРН PAGE CONTROLLER в чистом виде:
//   один URL ("/") = один класс-контроллер (этот PageModel).
//   Вся логика страницы собрана здесь: и рендеринг, и все POST-действия.
//   Сравните с MVP-проектом, где те же действия размазаны по пяти
//   контроллерам (Board/Tasks/Epics/Users/Data).
//
// Механика Razor Pages, которую важно понять:
//
// 1) OnGet()/OnPostXxx() - ХЕНДЛЕРЫ. Какой хендлер вызвать при POST,
//    решает параметр URL "?handler=Xxx" - его автоматически добавляет
//    тег-helper <form asp-page-handler="Xxx">.
//
// 2) [BindProperty(SupportsGet = true)] - свойства биндятся И из query-string
//    (GET), И из формы (POST). Это наши фильтры: они живут в URL, поэтому
//    ссылку с фильтрами можно отправить коллеге.
//
// 3) POST-хендлеры принимают аргументы напрямую - биндер сопоставляет их
//    с полями формы ПО ИМени (name="title" -> аргумент title).
//
// 4) После каждой мутации - PRG (Post-Redirect-Get): редирект на GET,
//    чтобы F5 не повторял действие.
// ============================================================================

public class IndexModel(IBoardStore store) : PageModel
{
    // ------------------------------------------------------------------
    // Фильтры и режим отображения (приходят из query-string)
    // ------------------------------------------------------------------

    // ВАЖНО: имя query-параметра и имя свойства НЕ обязаны совпадать -
    // ключ в URL задаётся через Name = "...". Здесь выбраны короткие
    // человекочитаемые ключи: ?board=...&view=list&assignee=...&epic=...

    /// <summary>Текущая доска. Null = не выбрана ни одна (пустой мир).</summary>
    [BindProperty(SupportsGet = true, Name = "board")] public Guid? BoardId { get; set; }

    /// <summary>"board" (канбан) или "list" (таблица) - фича UI Navigation.</summary>
    [BindProperty(SupportsGet = true, Name = "view")] public string ViewMode { get; set; } = "board";

    /// <summary>Фильтр по исполнителю: null/"" - все, "none" - без исполнителя, иначе Guid.</summary>
    [BindProperty(SupportsGet = true, Name = "assignee")] public string? AssigneeId { get; set; }

    /// <summary>Фильтр по эпику: тот же формат.</summary>
    [BindProperty(SupportsGet = true, Name = "epic")] public string? EpicId { get; set; }

    /// <summary>Поиск по заголовку и описанию (фича UI Navigation).</summary>
    [BindProperty(SupportsGet = true)] public string? Q { get; set; }

    /// <summary>"order" - как лежат в колонке, "priority" - сначала Высокий.</summary>
    [BindProperty(SupportsGet = true)] public string Sort { get; set; } = "order";

    // ------------------------------------------------------------------
    // Данные для разметки (заполняются в OnGet)
    // ------------------------------------------------------------------

    public Board? CurrentBoard { get; private set; }
    public IReadOnlyList<Board> AllBoards { get; private set; } = [];
    public IReadOnlyList<BoardUser> Users { get; private set; } = [];

    /// <summary>Задачи после фильтрации и сортировки; канбан дополнительно режет по колонкам.</summary>
    public IReadOnlyList<TaskItem> VisibleTasks { get; private set; } = [];

    /// <summary>(эпик, всего задач, готово) - для прогресса "2/5 (40%)".</summary>
    public IReadOnlyList<(Epic Epic, int Total, int Done)> EpicStats { get; private set; } = [];

    // ---- открытые диалоги: их состояние определяется ТОЛЬКО query-string ----
    // Это сильная сторона Page Controller: "какой диалог открыт" - часть URL,
    // F5/шаринг ссылки воспроизводят экран ровно как видел пользователь.

    public TaskItem? DetailTask { get; private set; }   // ?task=TASK-3
    public TaskItem? EditTask { get; private set; }     // ?edit=TASK-3
    public bool ShowNewTaskDialog { get; private set; } // ?newtask=1
    public TaskState NewTaskState { get; private set; } // ...&state=InProgress
    public bool ShowNewBoardDialog { get; private set; }// ?newboard=1
    public bool ShowRenameBoardDialog { get; private set; }
    public bool ShowNewEpicDialog { get; private set; }
    public bool ShowResetDialog { get; private set; }
    public Epic? DeleteEpicTarget { get; private set; } // ?delepic=EPIC-2 (выбор режима удаления)

    // ------------------------------------------------------------------
    // GET: собрать всё для рендеринга
    // ------------------------------------------------------------------

    public void OnGet()
    {
        LoadWorld();

        // Разбор диалоговых параметров. Всё, кроме фильтров, читаем прямо из
        // Request.Query - это одноразовые "команды открыть", их не нужно
        // протаскивать через POST-редиректы.
        DetailTask = ResolveTask(Request.Query["task"]);
        EditTask = ResolveTask(Request.Query["edit"]);
        ShowNewTaskDialog = Request.Query.ContainsKey("newtask");
        NewTaskState = Enum.TryParse<TaskState>(Request.Query["state"], out var st) ? st : TaskState.ToDo;
        ShowNewBoardDialog = Request.Query.ContainsKey("newboard");
        ShowRenameBoardDialog = Request.Query.ContainsKey("rename") && CurrentBoard != null;
        ShowNewEpicDialog = Request.Query.ContainsKey("newepic");
        ShowResetDialog = Request.Query.ContainsKey("reset");
        DeleteEpicTarget = ResolveEpic(Request.Query["delepic"]);

        ApplyFilters();
    }

    /// <summary>
    /// Экспорт JSON (gherkin: Persistence / "Экспорт данных").
    /// FileResult отдаёт файл на скачивание, страница не меняется.
    /// </summary>
    public IActionResult OnGetExport()
    {
        var json = store.ExportJson();
        return File(System.Text.Encoding.UTF8.GetBytes(json),
            contentType: "application/json",
            fileDownloadName: $"kanban-export-{DateTime.Now:yyyyMMdd-HHmmss}.json");
    }

    // ------------------------------------------------------------------
    // POST: доски (gherkin-фича Board Management)
    // ------------------------------------------------------------------

    public IActionResult OnPostCreateBoard(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return BackToBoard();
        var board = store.CreateBoard(name);
        Flash($"Доска \"{board.Name}\" создана");
        return BackToBoard(board.Id);           // сразу переключаемся на новую доску
    }

    public IActionResult OnPostRenameBoard(Guid boardId, string name)
    {
        if (!store.RenameBoard(boardId, name)) Flash("Доска не найдена");
        return BackToBoard(boardId);
    }

    public IActionResult OnPostDeleteBoard(Guid boardId)
    {
        var board = store.FindBoard(boardId);
        store.DeleteBoard(boardId);
        Flash($"Доска \"{board?.Name}\" удалена");
        // Cookie могла указывать на удалённую доску - OnGet сам откатится к первой
        return RedirectToPage();
    }

    // ------------------------------------------------------------------
    // POST: задачи (gherkin-фича Task Management)
    // ------------------------------------------------------------------

    // Опциональные ссылки (исполнитель, эпик, дедлайн) принимаем строками:
    // пустое поле формы должно стать null, а не ошибкой биндинга.
    // Это же учит видеть границу "строка из формы -> доменный тип".

    public IActionResult OnPostCreateTask(
        Guid boardId, string title, string? description,
        string assigneeId, string epicId, string? deadline,
        TaskState state, WorkItemType type, Priority priority)
    {
        if (!string.IsNullOrWhiteSpace(title))
            store.AddTask(boardId, new NewTask(
                title, description,
                ParseOptionalGuid(assigneeId), ParseOptionalGuid(epicId),
                state, type, priority, ParseOptionalDate(deadline)));
        return BackToBoard(boardId);
    }

    public IActionResult OnPostUpdateTask(
        Guid boardId, Guid taskId, string title, string? description,
        string assigneeId, string epicId, string? deadline,
        TaskState state, WorkItemType type, Priority priority)
    {
        if (!string.IsNullOrWhiteSpace(title))
            store.UpdateTask(boardId, taskId, t =>
            {
                t.Title = title.Trim();
                t.Description = description ?? "";
                t.AssigneeId = ParseOptionalGuid(assigneeId);
                t.EpicId = ParseOptionalGuid(epicId);
                t.Deadline = ParseOptionalDate(deadline);
                // Смена колонки через форму редактирования - тоже MoveTask-семантика:
                // стор перенумерует колонки сам.
                if (t.State != state) { /* порядок пересчитает MoveTask */ }
                t.State = state;
                t.Type = type;
                t.PriorityLevel = priority;
            });
        return BackToBoard(boardId);
    }

    public IActionResult OnPostDeleteTask(Guid boardId, Guid taskId)
    {
        store.DeleteTask(boardId, taskId);
        return BackToBoard(boardId);
    }

    /// <summary>
    /// Перемещение задачи drag-and-drop'ом. Вызывается НЕ формой, а fetch'ем
    /// из board.js, поэтому возвращаем 204 No Content вместо редиректа -
    /// браузерный переход не нужен, JS сам перезагрузит страницу.
    /// </summary>
    public IActionResult OnPostMoveTask(Guid boardId, Guid taskId, TaskState column, int index)
    {
        // PageModel (в отличие от ControllerBase) не имеет хелпера NoContent() -
        // создаём результат напрямую. Это нормальная практика.
        return store.MoveTask(boardId, taskId, column, index) ? new NoContentResult() : NotFound();
    }

    // ------------------------------------------------------------------
    // POST: эпики (gherkin-фича Epic Management)
    // ------------------------------------------------------------------

    public IActionResult OnPostCreateEpic(Guid boardId, string title, string? description)
    {
        if (!string.IsNullOrWhiteSpace(title)) store.AddEpic(boardId, title, description);
        return BackToBoard(boardId);
    }

    /// <summary>Удаление эпика с выбором судьбы задач (отвязать или каскадно удалить).</summary>
    public IActionResult OnPostDeleteEpic(Guid boardId, Guid epicId, string mode)
    {
        var parsed = Enum.TryParse<EpicDeleteMode>(mode, out var m) ? m : EpicDeleteMode.DetachTasks;
        store.DeleteEpic(boardId, epicId, parsed);
        return BackToBoard(boardId);
    }

    // ------------------------------------------------------------------
    // POST: сиды и сброс (gherkin-фича Data Seeding)
    // ------------------------------------------------------------------

    public IActionResult OnPostSeedEpic(Guid boardId)
    {
        store.SeedTestEpic(boardId);
        return BackToBoard(boardId);
    }

    public IActionResult OnPostSeedTasks(Guid boardId, int count)
    {
        store.SeedRandomTasks(boardId, Math.Clamp(count, 1, 100));
        return BackToBoard(boardId);
    }

    /// <summary>Опасное действие: подтверждение словом "СБРОС" проверяется на сервере.</summary>
    public IActionResult OnPostResetAll(string confirmWord)
    {
        if (confirmWord != "СБРОС")
        {
            Flash("Для сброса нужно ввести слово СБРОС");
            return BackToBoard();
        }
        store.ResetAll();
        Response.Cookies.Delete(BoardCookie);
        return RedirectToPage();
    }

    /// <summary>Импорт JSON (gherkin: "Импорт данных"). Заменяет всё состояние.</summary>
    public async Task<IActionResult> OnPostImportAsync(IFormFile file)
    {
        if (file is null || file.Length == 0)
        {
            Flash("Файл не выбран");
            return RedirectToPage();
        }
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            store.ImportJson(await reader.ReadToEndAsync());
            Flash("Данные импортированы");
        }
        catch (Exception ex)
        {
            Flash($"Ошибка импорта: {ex.Message}");
        }
        // Состояние заменено целиком - старые фильтры могут указывать в никуда,
        // поэтому редирект БЕЗ сохранения query-параметров.
        return RedirectToPage();
    }

    // ------------------------------------------------------------------
    // Хелперы для разметки (view вызывает их как Model.UserOf(...) и т.п.)
    // ------------------------------------------------------------------

    public BoardUser? UserOf(Guid? id) => id is null ? null : Users.FirstOrDefault(u => u.Id == id);

    public Epic? EpicOf(Guid? id) =>
        CurrentBoard?.Epics.FirstOrDefault(e => e.Id == id);

    public static string TaskKey(TaskItem t) => $"TASK-{t.Number}";

    // ------------------------------------------------------------------
    // Приватная кухня
    // ------------------------------------------------------------------

    private const string BoardCookie = "kanban.board";

    /// <summary>
    /// Загружает мир: текущую доску (query -> cookie -> первая), справочники.
    /// </summary>
    private void LoadWorld()
    {
        AllBoards = store.Boards;
        Users = store.Users;

        // Цепочка выбора доски: явный параметр > cookie "последней доски" > первая.
        if (BoardId is null && Guid.TryParse(Request.Cookies[BoardCookie], out var cookieId))
            BoardId = cookieId;

        CurrentBoard = BoardId is not null ? store.FindBoard(BoardId.Value) : null
                       ?? store.FirstBoard();      // запрошенная доска удалена -> берём любую

        if (CurrentBoard is not null)
        {
            BoardId = CurrentBoard.Id;              // нормализуем параметр
            // gherkin: "отображается последняя открытая доска" - запоминаем в cookie
            Response.Cookies.Append(BoardCookie, CurrentBoard.Id.ToString());
        }
        else
        {
            BoardId = null;                          // мир пуст
        }
    }

    /// <summary>Применяет фильтры исполнителя/эпика, поиск и сортировку.</summary>
    private void ApplyFilters()
    {
        if (CurrentBoard is null) { VisibleTasks = []; return; }

        IEnumerable<TaskItem> query = CurrentBoard.Tasks;

        if (!string.IsNullOrEmpty(AssigneeId))
        {
            var aid = ParseOptionalGuid(AssigneeId);
            query = aid is null
                ? query.Where(t => t.AssigneeId is null)          // "none": без исполнителя
                : query.Where(t => t.AssigneeId == aid);
        }

        if (!string.IsNullOrEmpty(EpicId))
        {
            var eid = ParseOptionalGuid(EpicId);
            query = eid is null
                ? query.Where(t => t.EpicId is null)
                : query.Where(t => t.EpicId == eid);
        }

        if (!string.IsNullOrWhiteSpace(Q))
            query = query.Where(t =>
                t.Title.Contains(Q, StringComparison.OrdinalIgnoreCase) ||
                t.Description.Contains(Q, StringComparison.OrdinalIgnoreCase));

        // Сортировка (gherkin: "сначала Высокий, затем Средний, затем Низкий")
        VisibleTasks = Sort == "priority"
            ? query.OrderByDescending(t => t.PriorityLevel).ThenBy(t => t.Order).ToList()
            : query.OrderBy(t => t.Order).ToList();

        // Прогресс эпиков считается по ВСЕМ задачам доски, а не по отфильтрованным.
        EpicStats = CurrentBoard.Epics.Select(e => (
            Epic: e,
            Total: CurrentBoard.Tasks.Count(t => t.EpicId == e.Id),
            Done: CurrentBoard.Tasks.Count(t => t.EpicId == e.Id && t.State == TaskState.Done)
        )).ToList();
    }

    /// <summary>"TASK-12" -> задача. Человекочитаемые ключи удобны в URL и тестах.</summary>
    private TaskItem? ResolveTask(string? key) =>
        CurrentBoard is null || string.IsNullOrEmpty(key)
            ? null
            : CurrentBoard.Tasks.FirstOrDefault(t =>
                $"TASK-{t.Number}".Equals(key, StringComparison.OrdinalIgnoreCase));

    private Epic? ResolveEpic(string? key) =>
        CurrentBoard is null || string.IsNullOrEmpty(key)
            ? null
            : CurrentBoard.Epics.FirstOrDefault(e =>
                $"EPIC-{e.Number}".Equals(key, StringComparison.OrdinalIgnoreCase));

    private static Guid? ParseOptionalGuid(string? s) =>
        Guid.TryParse(s, out var g) ? g : null;

    private static DateOnly? ParseOptionalDate(string? s) =>
        DateOnly.TryParse(s, out var d) ? d : null;

    /// <summary>
    /// PRG-редирект обратно на доску СОХРАНЯЯ фильтры. RouteValues с null
    /// значениями выбрасываются генератором URL - лишних "?q=" не будет.
    /// </summary>
    private IActionResult BackToBoard(Guid? forceBoard = null)
    {
        var target = forceBoard ?? BoardId;
        return target is not null
            ? RedirectToPage(new
            {
                board = target,
                view = ViewMode,
                assignee = string.IsNullOrEmpty(AssigneeId) ? null : AssigneeId,
                epic = string.IsNullOrEmpty(EpicId) ? null : EpicId,
                q = string.IsNullOrWhiteSpace(Q) ? null : Q,
                sort = Sort == "order" ? null : Sort
            })
            : RedirectToPage();                     // досок нет вообще - просто "/"
    }

    private void Flash(string message) => TempData["Flash"] = message;
}
