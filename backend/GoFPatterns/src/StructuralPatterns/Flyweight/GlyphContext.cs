namespace Self.Patterns.StructuralPatterns.Flyweight;

/// <summary>
/// GlyphContext — хранит внешнее состояние (шрифт, позиция)
/// </summary>
public class GlyphContext
{
    public string? Font { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int Width { get; set; }

    public void IncrementX()
    {
        if (X == Width)
        {
            X = 0;
            Y += 1;
        }
        else
        {
            X += 1;
        }
    }
}
