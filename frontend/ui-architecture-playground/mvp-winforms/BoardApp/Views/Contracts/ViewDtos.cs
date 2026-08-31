// ============================================================================
// DTO КОНТРАКТОВ ПРЕДСТАВЛЕНИЙ (view contracts).
//
// Это данные, которыми Presenter обменивается с View. Они НЕ доменные модели
// (TaskItem/Board остались в BoardApp.Core), а "сырые строки для показа":
// Presenter сам отформатировал ключи, подписи и цвета, и View остаётся только
// отобразить их. Именно поэтому WinForms-View можно заменить на консоль -
// или, как в SmokeTest, на фейковый класс в юнит-тесте.
//
// Сравни с MVC: там View сама вытаскивает детали из ViewModel через Razor.
// Здесь Presenter делает это ЗАРАНЕЕ и кладёт во View готовые плоские записи.
// ============================================================================

using BoardApp.Core;

namespace BoardApp.Views.Contracts;

/// <summary>Пункт выпадающего списка досок.</summary>
public sealed record BoardListItem(Guid Id, string Name);

/// <summary>Карточка задачи в колонке канбана. Всё уже строками - View не думает.</summary>
public sealed record TaskCardVm(
    Guid Id,
    string Key,              // "TASK-3"
    string Title,
    string TypeName,         // "Баг"
    string PriorityName,     // "Высокий"
    bool IsHighPriority,     // для подкраски карточки
    string? AssigneeName,
    DateOnly? Deadline,
    bool IsOverdue,
    string? EpicKey);        // "EPIC-2" или null

/// <summary>Колонка канбана: заголовок + карточки в порядке отображения.</summary>
public sealed record ColumnVm(TaskState State, string Title, IReadOnlyList<TaskCardVm> Cards);

/// <summary>Строка сайдбара эпиков: прогресс считается презентером по ВСЕМ задачам доски.</summary>
public sealed record EpicStatRow(Guid Id, string Key, string Title, int Total, int Done);

/// <summary>Опция выбора пользователя/эпика в комбобоксах диалогов и фильтров.</summary>
public sealed record OptionVm(Guid Id, string Label);

/// <summary>Текущее состояние фильтров - View читает его из контролов, Presenter применяет.</summary>
public sealed record FilterCriteria(
    Guid? AssigneeId,     // null = все; SpecialNoneId = "без исполнителя"
    Guid? EpicId,         // null = все; SpecialNoneId = "без эпика"
    string SearchText,
    string SortMode);     // "order" | "priority"

/// <summary>Маркер-значение для пункта "без исполнителя/без эпика" в фильтрах.</summary>
public static class FilterSpecial
{
    public static readonly Guid None = Guid.Empty;
}

/// <summary>Строка табличного вида доски (вкладка "Список").</summary>
public sealed record TaskRow(
    string Key, string Title, string StateName, string PriorityName,
    string AssigneeName, string DeadlineText);

/// <summary>Аргументы события "пользователь перетащил задачу" (WinForms DnD).</summary>
public sealed class TaskMovedEventArgs(Guid taskId, TaskState targetColumn, int index) : EventArgs
{
    public Guid TaskId { get; } = taskId;
    public TaskState TargetColumn { get; } = targetColumn;
    /// <summary>Позиция среди карточек целевой колонки (0 = самая верхняя).</summary>
    public int Index { get; } = index;
}

/// <summary>Аргументы событий с идентификатором сущности (выбор доски, открытие задачи...).</summary>
public sealed class IdEventArgs(Guid id) : EventArgs
{
    public Guid Id { get; } = id;
}

/// <summary>Результат диалога удаления пользователя: подтверждён ли и на кого переназначить.</summary>
public sealed record ReassignChoice(bool Confirmed, Guid? ReassignTo);
