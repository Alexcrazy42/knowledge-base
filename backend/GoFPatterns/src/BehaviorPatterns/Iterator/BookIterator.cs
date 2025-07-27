namespace Self.Patterns.BehaviorPatterns.Iterator;

public class BookIterator : IIterator<Book>
{
    private readonly BookCollection collection;
    private int currentIndex = -1;

    public BookIterator(BookCollection collection)
    {
        this.collection = collection;
    }

    public Book Current => collection[currentIndex];

    public bool MoveNext()
    {
        currentIndex++;
        return currentIndex < collection.Count;
    }

    public void Reset()
    {
        currentIndex = -1;
    }
}
