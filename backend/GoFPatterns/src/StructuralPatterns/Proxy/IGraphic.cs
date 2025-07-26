namespace Self.Patterns.StructuralPatterns.Proxy;

/// <summary>
/// Subject - интерфейс для реального объекта
/// </summary>
public interface IGraphic
{
    void Draw();
    int Width { get; }
    int Height { get; }
}
