namespace Self.Patterns.BehaviorPatterns.Memento;

/// <summary>
/// Caretaker (механизм отката) — посыльный
/// </summary>
public class History
{
    private readonly Stack<CanvasMemento> states = new();

    public void Save(CanvasMemento memento)
    {
        states.Push(memento);
    }

    public CanvasMemento Undo()
    {
        states.Pop();
        return states.Peek();
    }
}
