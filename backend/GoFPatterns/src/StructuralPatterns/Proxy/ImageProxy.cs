namespace Self.Patterns.StructuralPatterns.Proxy;

public class ImageProxy : IGraphic
{
    private readonly string filePath;
    private Image? realImage;

    public ImageProxy(string filePath)
    {
        this.filePath = filePath;
    }

    public void Draw()
    {
        if (realImage == null)
        {
            Console.WriteLine("Создали реальный объект");
            realImage = new Image(filePath); // Ленивая загрузка
        }
        realImage.Draw();
    }

    public int Width => realImage?.Width ?? 800; // Значения по умолчанию
    public int Height => realImage?.Height ?? 600;
}
