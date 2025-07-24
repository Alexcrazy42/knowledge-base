namespace Self.Patterns.StructuralPatterns.Bridge;

// Implementor
public interface IWindowImpl
{
    void DrawText(string text);
    void DrawBorder();
}
