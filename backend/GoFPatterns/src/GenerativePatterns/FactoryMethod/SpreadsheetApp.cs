namespace Self.Patterns.GenerativePatterns.FactoryMethod;

public class SpreadsheetApp : Application
{
    public override IDocument CreateDocument(string name)
    {
        Console.WriteLine($"Табличный редактор создает документ: {name}");
        return new SpreadsheetDocument(name);
    }
}
