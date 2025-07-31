namespace Self.Patterns.BehaviorPatterns.Memento;

/// <summary>
/// Memento (SolverState) — хранитель состояния
/// </summary>
public class CanvasMemento
{
    // Приватные поля — только для Originator
    private readonly string? state;

    // Узкий конструктор (для Caretaker)
    public CanvasMemento(string? state)
    {
        this.state = state;
    }

    // Широкий интерфейс (только для Originator)
    public string? GetState() => state;
}
