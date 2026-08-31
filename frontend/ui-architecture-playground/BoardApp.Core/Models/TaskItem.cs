namespace BoardApp.Core;

/// <summary>
/// Задача на доске.
/// Класс называется TaskItem, а не Task, чтобы не конфликтовать
/// с System.Threading.Tasks.Task (его использует async/await).
/// </summary>
public sealed class TaskItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Инкрементальный номер В ПРЕДЕЛАХ ДОСКИ. Человекочитаемый ключ = $"TASK-{Number}".</summary>
    public int Number { get; set; }

    public string Title { get; set; } = "";

    public string Description { get; set; } = "";

    /// <summary>Исполнитель. Nullable: задача может быть нераспределена.</summary>
    public Guid? AssigneeId { get; set; }

    /// <summary>Эпик, к которому привязана задача. Nullable.</summary>
    public Guid? EpicId { get; set; }

    /// <summary>Колонка доски == статус. Порядок внутри колонки определяет <see cref="Order"/>.</summary>
    public TaskState State { get; set; } = TaskState.ToDo;

    public WorkItemType Type { get; set; } = WorkItemType.Task;

    public Priority PriorityLevel { get; set; } = Priority.Medium;

    // Поле названо PriorityLevel по той же причине, что и TaskItem:
    // не плодить конфликт имён с потенциальными using'ами.

    /// <summary>Дедлайн. Nullable - в gherkin это опциональное поле.</summary>
    public DateOnly? Deadline { get; set; }

    // ---- Метаданные (gherkin-фича "Метаданные и автоматические поля") ----
    // Заполняются ТОЛЬКО стором при мутациях, руками их никто не ставит.

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Позиция задачи внутри своей колонки (0,1,2...). Нужна для
    /// drag-and-drop перестановок внутри одной колонки.
    /// Инвариант: у задач одной доски и одного состояния значения Order идут подряд.
    /// </summary>
    public int Order { get; set; }
}
