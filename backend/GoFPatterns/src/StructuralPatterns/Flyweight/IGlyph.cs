namespace Self.Patterns.StructuralPatterns.Flyweight;

/// <summary>
/// Интерфейс приспособленца
/// </summary>
public interface IGlyph
{
    void Draw(GlyphContext context); // Внешнее состояние передаётся через контекст
}
