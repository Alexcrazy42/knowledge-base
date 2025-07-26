namespace Self.Patterns.StructuralPatterns.Flyweight;

/// <summary>
///  ConcreteFlyweight (Character) — разделяемый символ
/// </summary>
public class Character : IGlyph
{
    private readonly char @char; // Внутреннее состояние (неизменяемое)

    public Character(char c)
    {
        @char = c;
    }

    public void Draw(GlyphContext context)
    {
        Console.WriteLine($"Символ '{@char}' в шрифте {context.Font} на позиции ({context.X}, {context.Y})");
    }
}
