namespace Self.Patterns.BehaviorPatterns.Iterator;

/// <summary>
/// ConcreteAggregate — коллекция книг
/// </summary>
public class BookCollection : IAggregate<Book>
{
    private readonly List<Book> books = new();

    public void Add(Book book) => books.Add(book);
    public Book this[int index] => books[index];
    public int Count => books.Count;

    public IIterator<Book> CreateIterator()
    {
        return new BookIterator(this); // Возвращаем итератор
    }
}
