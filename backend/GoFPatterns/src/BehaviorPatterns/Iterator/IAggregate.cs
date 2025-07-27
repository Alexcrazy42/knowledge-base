namespace Self.Patterns.BehaviorPatterns.Iterator;

public interface IAggregate<out T>
{
    IIterator<T> CreateIterator();
}
