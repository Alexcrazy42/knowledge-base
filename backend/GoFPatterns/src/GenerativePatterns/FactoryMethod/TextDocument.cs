namespace Self.Patterns.GenerativePatterns.FactoryMethod;

public class TextDocument : IDocument
{
    public string Name { get; }

    public TextDocument(string name)
    {
        Name = name;
    }

    public void Open()
    {
        Console.WriteLine($"Открыт текстовый документ: {Name}");
    }

    public void Save()
    {
        Console.WriteLine($"Сохранен текстовый документ: {Name}");
    }
}
