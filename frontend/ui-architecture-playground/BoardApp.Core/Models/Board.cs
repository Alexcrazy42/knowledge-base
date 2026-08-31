namespace BoardApp.Core;

/// <summary>
/// Доска. Корень агрегата: задачи и эпики живут ВНУТРИ доски,
/// счётчики номеров тоже пер-досковые (TASK-1 в двух досках - это разные задачи).
/// </summary>
public sealed class Board
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = "";

    public List<TaskItem> Tasks { get; set; } = [];

    public List<Epic> Epics { get; set; } = [];

    // Счётчики для генерации человекочитаемых ключей TASK-N / EPIC-N.
    // Хранятся прямо в доске, чтобы нумерация была сквозной по доске
    // и пережила экспорт/импорт.

    public int TaskCounter { get; set; }

    public int EpicCounter { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
