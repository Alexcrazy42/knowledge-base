namespace Self.Patterns.BehaviorPatterns.Memento;

/// <summary>
///  Originator (ContraintSolver) — хозяин состояния
/// </summary>
public class Canvas
{
    private string? content; // Текущее состояние

    public void Draw(string shape)
    {
        content += $"[{shape}]"; // Изменяем состояние
    }

    // Создание снимка состояния
    public CanvasMemento SaveState()
    {
        return new CanvasMemento(content);
    }

    // Восстановление состояния
    public void RestoreState(CanvasMemento memento)
    {
        content = memento.GetState();
    }

    public void Print()
    {
        Console.WriteLine($"Canvas: {content}");
    }
}
