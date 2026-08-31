namespace BoardApp.Core;

// ============================================================================
// Перечисления домена.
//
// ВАЖНО: имена членов enum'а - это часть контракта, они утекут в URL, формы
// и JSON (например, ?state=InProgress). Поэтому латиница и PascalCase,
// а русские подписи для UI выдаёт метод ToDisplay() ниже.
// ============================================================================

/// <summary>Колонка канбан-доски == статус задачи (см. gherkin: "To Do", "In Progress", "Done").</summary>
public enum TaskState
{
    ToDo,
    InProgress,
    Done
}

/// <summary>Приоритет задачи.</summary>
public enum Priority
{
    Low,
    Medium,
    High
}

/// <summary>Тип рабочего элемента (как в Jira: Task/Bug/Story).</summary>
public enum WorkItemType
{
    Task,
    Bug,
    Story
}

public static class EnumDisplayExtensions
{
    // Подписи для UI живут здесь, чтобы оба приложения показывали ОДИНАКОВЫЕ строки.
    // В "серьёзном" проекте это была бы локализация (resx) или словарь на клиенте.

    public static string ToDisplay(this TaskState state) => state switch
    {
        TaskState.ToDo => "To Do",
        TaskState.InProgress => "In Progress",
        TaskState.Done => "Done",
        _ => state.ToString()
    };

    public static string ToDisplay(this Priority priority) => priority switch
    {
        Priority.Low => "Низкий",
        Priority.Medium => "Средний",
        Priority.High => "Высокий",
        _ => priority.ToString()
    };

    public static string ToDisplay(this WorkItemType type) => type switch
    {
        WorkItemType.Task => "Задача",
        WorkItemType.Bug => "Баг",
        WorkItemType.Story => "История",
        _ => type.ToString()
    };
}
