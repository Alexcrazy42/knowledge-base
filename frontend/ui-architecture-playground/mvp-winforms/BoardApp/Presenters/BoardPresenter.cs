// ============================================================================
// BoardPresenter - ПРЕЗЕНТЕР главного экрана. "P" в MVP.
//
// Весь экран знает о мире только три вещи:
//   IBoardView  - чем показывать (интерфейс, не класс!)
//   IBoardStore - где данные (домен)
//   фабрики     - как открыть другие экраны (внедрены снаружи, см. Program.cs)
//
// Здесь НЕТ ни одного типа из System.Windows.Forms - и это не случайность:
// презентер можно запустить в консоли или в юнит-тесте (см. SmokeTest).
// Сравни: в MVC эту логику размазали бы по контроллерам + Razor-хелперам.
//
// Жизненный цикл: один презентер на всё время жизни окна (в отличие от веба,
// где контроллер рождается на каждый запрос). Поэтому он может хранить
// состояние (_currentBoardId) в обычном поле.
// ============================================================================

using BoardApp.Core;
using BoardApp.Views.Contracts;

namespace BoardApp.Presenters;

public sealed class BoardPresenter(
    IBoardView view,
    IBoardStore store,
    Action openUsersScreen)
{
    private Guid? _currentBoardId;

    // ------------------------------------------------------------------
    // Точка входа: подписаться на события view и сделать первый рендер.
    // Вызывается композиционным корнем (Program.cs) после связывания.
    // ------------------------------------------------------------------
    public void Run()
    {
        Subscribe();

        _currentBoardId = store.FirstBoard()?.Id;
        view.ResetFilters(AssigneeFilterOptions(store.Users), EpicOptions());
        Reload();
        view.ShowFlash(_currentBoardId is null
            ? "Создайте первую доску"
            : $"Открыта доска \"{CurrentBoard()?.Name}\"");
    }

    /// <summary>Внешний сигнал "данные изменились" (например, поработали с пользователями).</summary>
    public void ExternalRefresh() => Reload();

    // ==================================================================
    // ГЛАВНЫЙ РЕНДЕР. Полная перезагрузка данных во view после ЛЮБОЙ
    // мутации - прямой аналог PRG-перезагрузки страницы в веб-версиях:
    // сервер/презентер заново отдаёт весь экран, а не патчит кусочки.
    // ==================================================================
    private void Reload()
    {
        var board = CurrentBoard();
        var users = store.Users;

        // список досок в комбобоксе
        view.ShowBoards(
            store.Boards.Select(b => new BoardListItem(b.Id, b.Name)).ToList(),
            _currentBoardId);

        if (board is null)
        {
            // пустой мир: колонки без карточек, эпиков нет
            view.ShowColumns(Enum.GetValues<TaskState>()
                .Select(s => new ColumnVm(s, s.ToDisplay(), [])).ToList());
            view.ShowEpics([]);
            view.ShowTaskTable([]);
            return;
        }

        // --- фильтрация + сортировка (та же семантика, что в веб-версиях) ---
        var criteria = view.ReadFilterCriteria();
        var visible = FilterAndSort(board.Tasks, criteria);

        // канбан: группировка по колонкам с сохранением Order
        var columns = Enum.GetValues<TaskState>().Select(s => new ColumnVm(
            s,
            s.ToDisplay(),
            visible.Where(t => t.State == s).Select(ToCard).ToList())).ToList();
        view.ShowColumns(columns);

        // прогресс эпиков считается по ВСЕМ задачам доски (не по отфильтрованным)
        view.ShowEpics(board.Epics.Select(e => new EpicStatRow(
            e.Id,
            $"EPIC-{e.Number}",
            e.Title,
            board.Tasks.Count(t => t.EpicId == e.Id),
            board.Tasks.Count(t => t.EpicId == e.Id && t.State == TaskState.Done))).ToList());

        // вкладка "Список": те же отфильтрованные задачи плоским списком
        view.ShowTaskTable(visible.Select(t => new TaskRow(
            $"TASK-{t.Number}",
            t.Title,
            t.State.ToDisplay(),
            t.PriorityLevel.ToDisplay(),
            users.FirstOrDefault(u => u.Id == t.AssigneeId)?.Name ?? "—",
            t.Deadline?.ToString("dd.MM.yyyy") ?? "—")).ToList());
    }

    // ------------------------------------------------------------------
    // Фильтры и сортировка. Правила 1-в-1 как в вебе:
    //   null = "не фильтруем", Guid.Empty = спецзначение "без исполнителя/эпика".
    // ------------------------------------------------------------------
    private static List<TaskItem> FilterAndSort(IEnumerable<TaskItem> tasks, FilterCriteria c)
    {
        IEnumerable<TaskItem> q = tasks;

        if (c.AssigneeId is { } a)
            q = q.Where(t => a == FilterSpecial.None ? t.AssigneeId is null : t.AssigneeId == a);
        if (c.EpicId is { } e)
            q = q.Where(t => e == FilterSpecial.None ? t.EpicId is null : t.EpicId == e);
        if (!string.IsNullOrWhiteSpace(c.SearchText))
        {
            var needle = c.SearchText.Trim();
            q = q.Where(t => t.Title.Contains(needle, StringComparison.OrdinalIgnoreCase)
                          || t.Description.Contains(needle, StringComparison.OrdinalIgnoreCase));
        }

        return c.SortMode == "priority"
            ? q.OrderBy(t => PriorityRank(t.PriorityLevel)).ThenBy(t => t.Order).ToList()
            : q.OrderBy(t => t.Order).ToList();
    }

    private static int PriorityRank(Priority p) => p switch
    {
        Priority.High => 0, Priority.Medium => 1, _ => 2
    };

    // ------------------------------------------------------------------
    // Маппинг домен -> DTO для карточек. View получает готовые строки.
    // ------------------------------------------------------------------
    private TaskCardVm ToCard(TaskItem t)
    {
        var board = CurrentBoard()!;
        return new TaskCardVm(
            t.Id,
            $"TASK-{t.Number}",
            t.Title,
            t.Type.ToDisplay(),
            t.PriorityLevel.ToDisplay(),
            t.PriorityLevel == Priority.High,
            store.Users.FirstOrDefault(u => u.Id == t.AssigneeId)?.Name,
            t.Deadline,
            t.Deadline is { } d && d < DateOnly.FromDateTime(DateTime.Today) && t.State != TaskState.Done,
            t.EpicId is null ? null : $"EPIC-{board.Epics.First(e => e.Id == t.EpicId).Number}");
    }

    private Board? CurrentBoard() =>
        _currentBoardId is { } id ? store.FindBoard(id) : null;

    // Опции фильтра исполнителя: спецпункт "без исполнителя" + все пользователи.
    // Пункт "(все)" (фильтр не активен) во view добавляет сама - он означает null.
    private static IReadOnlyList<OptionVm> AssigneeFilterOptions(IReadOnlyList<BoardUser> users) =>
        new[] { new OptionVm(FilterSpecial.None, "Без исполнителя") }
            .Concat(users.Select(u => new OptionVm(u.Id, u.Name)))
            .ToList();

    private IReadOnlyList<OptionVm> EpicOptions() =>
        CurrentBoard()?.Epics
            .Select(e => new OptionVm(e.Id, $"EPIC-{e.Number} · {e.Title}"))
            .Prepend(new OptionVm(FilterSpecial.None, "Без эпика"))
            .ToList() ?? [];

    // ==================================================================
    // ОБРАБОТЧИКИ СОБЫТИЙ. Каждый: прочитать ввод -> мутировать домен ->
    // Reload() -> flash. Никакой логики во view.
    // ==================================================================

    private void Subscribe()
    {
        view.CreateBoardRequested += (_, _) => CreateBoard();
        view.RenameBoardRequested += (_, _) => RenameBoard();
        view.DeleteBoardRequested += (_, _) => DeleteBoard();
        view.SwitchBoardRequested += (_, e) => SwitchTo(e.Id);
        view.CreateTaskRequested += (_, state) => OpenTaskDialog(null, state);
        view.TaskOpenRequested += (_, e) => OpenTaskDialog(e.Id, null);
        view.TaskDeleteRequested += (_, e) => DeleteTask(e.Id);
        view.TaskMoved += (_, e) => MoveTask(e);
        view.ApplyFiltersRequested += (_, _) => Reload();
        view.ResetFiltersRequested += (_, _) =>
        {
            view.ResetFilters(AssigneeFilterOptions(store.Users), EpicOptions());
            Reload();
        };
        view.SeedEpicRequested += (_, _) => SeedEpic();
        view.SeedTasksRequested += (_, _) => SeedTasks();
        view.CreateEpicRequested += (_, _) => CreateEpic();
        view.EpicDeleteRequested += (_, e) => DeleteEpic(e.Id);
        view.ExportRequested += (_, _) => Export();
        view.ImportRequested += (_, _) => Import();
        view.ResetAllRequested += (_, _) => ResetAll();
        view.OpenUsersRequested += (_, _) => openUsersScreen();
    }

    private void CreateBoard()
    {
        var name = view.Prompt("Новая доска", "Название доски:");
        if (string.IsNullOrWhiteSpace(name)) return;              // отмена или пусто

        var board = store.CreateBoard(name.Trim());
        _currentBoardId = board.Id;                                // gherkin: сразу переключаемся
        Reload();
        view.ShowFlash($"Доска \"{board.Name}\" создана");
    }

    private void RenameBoard()
    {
        var board = CurrentBoard();
        if (board is null) return;
        var name = view.Prompt("Переименовать доску", "Новое название:", board.Name);
        if (string.IsNullOrWhiteSpace(name)) return;

        store.RenameBoard(board.Id, name.Trim());
        Reload();
        view.ShowFlash("Доска переименована");
    }

    private void DeleteBoard()
    {
        var board = CurrentBoard();
        if (board is null) return;
        if (!view.Confirm($"Удалить доску \"{board.Name}\" вместе со всеми задачами?")) return;

        store.DeleteBoard(board.Id);
        _currentBoardId = store.FirstBoard()?.Id;                  // gherkin: показать последнюю оставшуюся
        Reload();
        view.ShowFlash("Доска удалена");
    }

    private void SwitchTo(Guid id)
    {
        if (_currentBoardId == id) return;                         // событие при перезаполнении списка
        _currentBoardId = id;
        Reload();                                                  // gherkin: последняя открытая = текущая в окне
    }

    /// <summary>
    /// Диалог задачи: создание (taskId=null) или редактирование.
    /// Обратите внимание на цикл валидации: пустой заголовок -> ошибка -> диалог
    /// снова открыт. Решение о валидности принимает ПРЕЗЕНТЕР, а не форма.
    /// </summary>
    private void OpenTaskDialog(Guid? taskId, TaskState? defaultState)
    {
        var board = CurrentBoard();
        if (board is null) return;

        var existing = taskId is { } tid ? board.Tasks.FirstOrDefault(t => t.Id == tid) : null;

        // Фабрика диалога внедрена снаружи (Program.cs): презентер не знает,
        // что это WinForms Form, - только контракт ITaskEditView.
        var dlg = _taskEditFactory();

        dlg.DialogTitle = existing is null ? "Новая задача" : $"Редактирование TASK-{existing.Number}";
        dlg.FillOptions(
            store.Users.Select(u => new OptionVm(u.Id, u.Name)).ToList(),
            board.Epics.Select(e => new OptionVm(e.Id, $"EPIC-{e.Number} · {e.Title}")).ToList());
        dlg.DefaultState = defaultState ?? existing?.State ?? TaskState.ToDo;

        if (existing is not null)
        {
            dlg.Title = existing.Title;
            dlg.Description = existing.Description;
            dlg.AssigneeId = existing.AssigneeId;
            dlg.EpicId = existing.EpicId;
            dlg.State = existing.State;
            dlg.Type = existing.Type;
            dlg.Priority = existing.PriorityLevel;
            dlg.Deadline = existing.Deadline;
        }
        else
        {
            dlg.Title = ""; dlg.Description = "";
            dlg.AssigneeId = null; dlg.EpicId = null;
            dlg.Type = WorkItemType.Task; dlg.Priority = Priority.Medium; dlg.Deadline = null;
        }

        while (true)
        {
            if (!dlg.ShowModal()) return;                          // отмена

            // Диагностика «Сохранить ничего не делает» -> %TEMP%\kanban-errors\winforms.log:
            // видно каждую итерацию цикла валидации и финальное создание задачи.
            Program.LogTrace($"EditTask: ShowModal=OK, Title='{dlg.Title}'");

            if (string.IsNullOrWhiteSpace(dlg.Title))
            {
                dlg.ShowValidationError("Заголовок обязателен.");
                continue;
            }

            if (existing is null)
            {
                var created = store.AddTask(board.Id, new NewTask(
                    dlg.Title.Trim(), dlg.Description.Trim(),
                    dlg.AssigneeId, dlg.EpicId,
                    dlg.State, dlg.Type, dlg.Priority, dlg.Deadline));
                Reload();
                view.ShowFlash(created is null ? "Не удалось создать задачу" : $"TASK-{created.Number} создана");
            }
            else
            {
                store.UpdateTask(board.Id, existing.Id, t =>
                {
                    t.Title = dlg.Title.Trim();
                    t.Description = dlg.Description.Trim();
                    t.AssigneeId = dlg.AssigneeId;
                    t.EpicId = dlg.EpicId;
                    t.State = dlg.State;
                    t.Type = dlg.Type;
                    t.PriorityLevel = dlg.Priority;
                    t.Deadline = dlg.Deadline;
                });
                Reload();
                view.ShowFlash($"TASK-{existing.Number} сохранена");
            }
            return;
        }
    }

    // фабрика диалога задачи: внедряется из Program.cs через UseTaskEditDialog
    private Func<ITaskEditView> _taskEditFactory = () =>
        throw new InvalidOperationException("Фабрика диалогов не подключена (см. UseTaskEditDialog)");

    public BoardPresenter UseTaskEditDialog(Func<ITaskEditView> factory)
    {
        _taskEditFactory = factory;
        return this;
    }

    private void DeleteTask(Guid taskId)
    {
        var board = CurrentBoard();
        var task = board?.Tasks.FirstOrDefault(t => t.Id == taskId);
        if (task is null) return;
        if (!view.Confirm($"Удалить TASK-{task.Number} \"{task.Title}\"?")) return;

        store.DeleteTask(board!.Id, task.Id);
        Reload();
        view.ShowFlash($"TASK-{task.Number} удалена");
    }

    private void MoveTask(TaskMovedEventArgs e)
    {
        var board = CurrentBoard();
        if (board is null) return;
        store.MoveTask(board.Id, e.TaskId, e.TargetColumn, e.Index);   // инварианты Order - внутри стора
        Reload();                                                       // SSR-стиль: полный перерендер
    }

    private void SeedEpic()
    {
        var board = CurrentBoard();
        if (board is null) return;
        var epic = store.SeedTestEpic(board.Id);
        Reload();
        view.ShowFlash(epic is null ? "Не удалось создать эпик" : $"EPIC-{epic.Number} с тестовыми задачами добавлен");
    }

    private void SeedTasks()
    {
        var board = CurrentBoard();
        if (board is null) return;
        store.SeedRandomTasks(board.Id, 10);
        Reload();
        view.ShowFlash("Добавлено 10 случайных задач");
    }

    // gherkin Epic Management: создание эпика через промпт заголовка.
    private void CreateEpic()
    {
        var board = CurrentBoard();
        if (board is null) return;

        var title = view.Prompt("Новый эпик", "Название эпика:");
        if (string.IsNullOrWhiteSpace(title)) return;

        var epic = store.AddEpic(board.Id, title.Trim(), description: null);
        Reload();
        view.ShowFlash(epic is null ? "Не удалось создать эпик" : $"EPIC-{epic.Number} создан");
    }

    // gherkin: при удалении непустого эпика спрашиваем режим -
    // отвязать задачи или удалить каскадом. Решение показывает ДИАЛОГ view,
    // но интерпретирует его результат presenter.
    private void DeleteEpic(Guid epicId)
    {
        var board = CurrentBoard();
        var epic = board?.Epics.FirstOrDefault(e => e.Id == epicId);
        if (epic is null) return;

        var count = board!.Tasks.Count(t => t.EpicId == epicId);
        var mode = view.ChooseEpicDeleteMode($"EPIC-{epic.Number}", epic.Title, count);
        if (mode is null) return;                                  // передумал

        store.DeleteEpic(board.Id, epicId, mode.Value);
        Reload();
        view.ShowFlash(mode == EpicDeleteMode.CascadeDeleteTasks
            ? $"EPIC-{epic.Number} удалён вместе с задачами"
            : $"EPIC-{epic.Number} удалён, задачи остались");
    }

    private void Export()
    {
        var stamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
        if (view.SaveToFile($"kanban-export-{stamp}.json", store.ExportJson()))
            view.ShowFlash("Данные экспортированы в JSON");
    }

    private void Import()
    {
        var json = view.OpenJsonFile();
        if (json is null) return;
        try
        {
            store.ImportJson(json);
            _currentBoardId = store.FirstBoard()?.Id;
            view.ResetFilters(AssigneeFilterOptions(store.Users), EpicOptions());
            Reload();
            view.ShowFlash("Импорт выполнен");
        }
        catch (Exception ex)
        {
            view.ShowFlash($"Ошибка импорта: {ex.Message}");       // битый JSON - штатная ситуация
        }
    }

    private void ResetAll()
    {
        var word = view.AskConfirmWord("полного сброса всех данных");
        if (word != "СБРОС")                                       // точное слово, регистр важен
        {
            view.ShowFlash("Сброс отменён (нужно слово СБРОС)");
            return;
        }
        store.ResetAll();
        _currentBoardId = null;
        view.ResetFilters(AssigneeFilterOptions(store.Users), EpicOptions());
        Reload();
        view.ShowFlash("Все данные удалены");
    }
}
