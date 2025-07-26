namespace Self.Patterns.StructuralPatterns.Flyweight;

/// <summary>
/// UnsharedConcreteFlyweight (Row, Column) — неразделяемые объекты
/// </summary>
public class Row : IGlyph
{
    private readonly List<IGlyph> childrens = new();

    public void Add(IGlyph glyph) => childrens.Add(glyph);

    public void Draw(GlyphContext context)
    {
        foreach (var child in childrens)
        {
            child.Draw(context);
            context.IncrementX(); // Меняем внешнее состояние (позицию)
        }
    }
}
