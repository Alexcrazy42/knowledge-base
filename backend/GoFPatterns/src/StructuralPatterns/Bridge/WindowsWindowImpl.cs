namespace Self.Patterns.StructuralPatterns.Bridge;

// ConcreteImplementor 1 (для Windows API)
public class WindowsWindowImpl : IWindowImpl
{
    public void DrawText(string text)
    {
        Console.WriteLine($"Windows: {text}");
    }

    public void DrawBorder()
    {
        Console.WriteLine("Windows: Drawing border...");
    }
}
