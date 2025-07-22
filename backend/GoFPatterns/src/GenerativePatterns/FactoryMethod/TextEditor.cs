namespace Self.Patterns.GenerativePatterns.FactoryMethod;

public class TextEditor : Application
{
    public override IDocument CreateDocument(string name)
    {
        Console.WriteLine($"Текстовый редактор создает документ: {name}");
        return new TextDocument(name);
    }
}
