namespace Self.Patterns.StructuralPatterns.Proxy;

public class Image : IGraphic
{
    private readonly string filePath;

    public Image(string filePath)
    {
        this.filePath = filePath;
        LoadFromDisk(); // Ресурсоёмкая операция
    }

    private void LoadFromDisk()
    {
        Console.WriteLine($"Загрузка изображения: {filePath}");
        // Здесь могла бы быть реальная загрузка (например, через System.Drawing)
    }

    public void Draw() => Console.WriteLine($"Рисуем изображение {filePath} ({Width}x{Height})");
    public int Width { get; } = 800; // Примерные значения
    public int Height { get; } = 600;
}
