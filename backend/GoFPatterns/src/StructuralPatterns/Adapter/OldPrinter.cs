namespace Self.Patterns.StructuralPatterns.Adapter;

public class OldPrinter
{
    public void PrintText(string text)
    {
        Console.WriteLine($"Старый принтер печатает: {text}");
    }
}
