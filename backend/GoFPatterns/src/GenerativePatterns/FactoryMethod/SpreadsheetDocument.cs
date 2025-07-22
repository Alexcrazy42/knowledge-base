namespace Self.Patterns.GenerativePatterns.FactoryMethod;

public class SpreadsheetDocument : IDocument
{
    public string Name { get; }

    public SpreadsheetDocument(string name)
    {
        Name = name;
    }

    public void Open()
    {
        Console.WriteLine($"Открыта таблица: {Name}");
    }

    public void Save()
    {
        Console.WriteLine($"Сохранена таблица: {Name}");
    }
}
