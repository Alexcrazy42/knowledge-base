namespace Self.Patterns.BehaviorPatterns.Iterator;

/// <summary>
/// Iterator — интерфейс итератора
/// </summary>
public interface IIterator<out T>
{
    T Current { get; }
    bool MoveNext();
    void Reset();
}
