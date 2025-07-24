namespace Self.Patterns.StructuralPatterns.Bridge;

// ConcreteImplementor 2 (для Linux/X11)
public class XWindowImpl : IWindowImpl
{
    public void DrawText(string text)
    {
        Console.WriteLine($"X11: {text}");
    }

    public void DrawBorder()
    {
        Console.WriteLine("X11: Drawing border...");
    }
}
