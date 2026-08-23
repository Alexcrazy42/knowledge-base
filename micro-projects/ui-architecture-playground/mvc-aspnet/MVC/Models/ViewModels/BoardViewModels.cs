using BoardApp.Core;

namespace MVC.Models.ViewModels;

// ============================================================================
// VIEW MODELS MVC-проекта.
//
// Идея та же, что и в PageController/ViewModels: контроллер собирает
// "готовый к показу" объект, view тупо рендерит. Разница в акцентах:
// в MVC ViewModel - это ЯВНЫЙ артефакт архитектуры (отдельная папка,
// отдельный класс на страницу), а не свойства PageModel.
//
// Сравните: PageController/Pages/Index.cshtml.cs держал те же данные
// прямо в себе. Здесь - отдельный класс BoardPageVm.
// ============================================================================

/// <summary>Всё, что нужно главной странице /Board/Index.</summary>
public sealed class BoardPageVm
{
    // ---- мир ----
    public Board? CurrentBoard { get; set; }
    public IReadOnlyList<Board> AllBoards { get; set; } = [];
    public IReadOnlyList<BoardUser> Users { get; set; } = [];
    public IReadOnlyList<TaskItem> VisibleTasks { get; set; } = [];

    /// <summary>(эпик, всего задач, готово) - для прогресс-баров сайдбара.</summary>
    public IReadOnlyList<EpicStat> EpicStats { get; set; } = [];

    // ---- открытые диалоги (состояние определяется query-string) ----
    public TaskItem? DetailTask { get; set; }
    public TaskItem? EditTask { get; set; }
    public bool ShowNewTaskDialog { get; set; }
    public TaskState NewTaskState { get; set; } = TaskState.ToDo;
    public bool ShowNewBoardDialog { get; set; }
    public bool ShowRenameDialog { get; set; }
    public bool ShowNewEpicDialog { get; set; }
    public bool ShowResetDialog { get; set; }
    public Epic? DeleteEpicTarget { get; set; }

    // ---- фильтры: хранятся, чтобы строить ссылки, сохраняющие контекст ----
    public string ViewMode { get; set; } = "board";
    public string AssigneeId { get; set; } = "";
    public string EpicId { get; set; } = "";
    public string? Q { get; set; }
    public string Sort { get; set; } = "order";

    public Guid? BoardId => CurrentBoard?.Id;

    /// <summary>Исполнитель по id (для аватарок в карточках).</summary>
    public BoardUser? UserOf(Guid? id) => id is null ? null : Users.FirstOrDefault(u => u.Id == id);

    /// <summary>Эпик по id.</summary>
    public Epic? EpicOf(Guid? id) =>
        CurrentBoard?.Epics.FirstOrDefault(e => e.Id == id);

    /// <summary>Прогресс эпика: готово / всего / проценты.</summary>
    public sealed record EpicStat(Epic Epic, int Total, int Done);
}

/// <summary>Карточка канбана: задача + разрешённые ссылки + URL деталей.</summary>
public sealed record TaskCardVm(
    TaskItem Task,
    BoardUser? Assignee,
    Epic? Epic,
    string DetailsUrl);

/// <summary>Форма создания/редактирования задачи (Existing == null => создание).</summary>
public sealed record TaskFormVm(
    Guid BoardId,
    TaskItem? Existing,
    TaskState DefaultState,
    IReadOnlyList<BoardUser> Users,
    IReadOnlyList<Epic> Epics);

/// <summary>Страница управления пользователями.</summary>
public sealed class UsersPageVm
{
    public IReadOnlyList<BoardUser> Users { get; set; } = [];
    public IReadOnlyDictionary<Guid, int> AssignmentCounts { get; set; } =
        new Dictionary<Guid, int>();

    /// <summary>Кого удаляем (диалог ?delete=id).</summary>
    public BoardUser? DeleteCandidate { get; set; }

    public int CountFor(Guid userId) => AssignmentCounts.GetValueOrDefault(userId);
}

/// <summary>
/// Статический хелпер построения ссылок на главную страницу СО ХРАНЕНИЕМ фильтров.
/// В Razor Pages аналог жил в @functions страницы (Link); в MVC его удобнее
/// вынести в обычный статический класс - вызывается из любой view.
/// </summary>
public static class BoardUrls
{
    public static string Build(BoardPageVm vm, params (string Key, string? Value)[] extra)
    {
        var pairs = new List<(string Key, string? Value)>
        {
            ("board", vm.BoardId?.ToString()),
            ("view", vm.ViewMode),
            ("assignee", vm.AssigneeId),
            ("epic", vm.EpicId),
            ("q", vm.Q),
            ("sort", vm.Sort == "order" ? null : vm.Sort)
        };
        foreach (var (key, value) in extra)
        {
            // Удаляем только пары с ЭТИМ ЖЕ ключом: RemoveAll по всем ключам extra
            // стирал бы предыдущие аргументы (?edit=TASK-1 исчезал из ссылки).
            pairs.RemoveAll(p => p.Key.Equals(key, StringComparison.OrdinalIgnoreCase));
            pairs.Add((key, value));
        }

        var qs = string.Join("&", pairs
            .Where(p => !string.IsNullOrEmpty(p.Value))
            .Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value!)}"));
        return qs.Length == 0 ? "/" : $"/?{qs}";
    }
}
