using Self.Patterns.StructuralPatterns.Adapter;
using Self.Patterns.StructuralPatterns.Bridge;
using Self.Patterns.StructuralPatterns.Composite;
using Self.Patterns.StructuralPatterns.Decorator;
using Self.Patterns.StructuralPatterns.Flyweight;
using Self.Patterns.StructuralPatterns.Proxy;
using File = System.IO.File;

namespace Self.Patterns.StructuralPatterns;

public class CommonClient
{
    public static void UseAdapter()
    {
        var oldPrinter = new OldPrinter();

        // Адаптер, который делает OldPrinter совместимым с IPrinter
        IPrinter printer = new PrinterAdapter(oldPrinter);

        // Теперь можно использовать старый принтер как новый
        printer.Print("Hello, Adapter Pattern!");
    }

    public static void UseBridge()
    {
        // Создаем окно с реализацией для Windows
        var windowsWindow = new IconWindow(new WindowsWindowImpl());
        windowsWindow.Draw();

        // Создаем окно с реализацией для X11 (Linux)
        var x11Window = new IconWindow(new XWindowImpl());
        x11Window.Draw();
    }

    public static void UseComposite()
    {
        var root = new OurDirectory("Root");
        root.Add(new OurFile("file1.txt", 100));
        root.Add(new OurFile("file2.txt", 200));

        var subDir = new OurDirectory("Subfolder");
        subDir.Add(new OurFile("file3.txt", 300));
        root.Add(subDir);

        Console.WriteLine($"Total size: {root.GetSize()}"); // 600
        root.Print();
    }

    public static void UseDecorator()
    {
        ICoffee coffee = new SimpleCoffee();
        Console.WriteLine($"{coffee.GetDescription()} = ${coffee.GetCost()}");

        coffee = new SugarDecorator(new MilkDecorator(coffee));

        Console.WriteLine($"{coffee.GetDescription()} = ${coffee.GetCost()}");
    }

    public static void UseFlyweight()
    {
        var factory = new GlyphFactory();
        var context = new GlyphContext { Font = "Arial", X = 0, Y = 0, Width = 10 };

        var row = new Row();
        row.Add(factory.GetCharacter('H'));
        row.Add(factory.GetCharacter('e'));
        row.Add(factory.GetCharacter('l'));
        row.Add(factory.GetCharacter('l'));
        row.Add(factory.GetCharacter('o'));
        row.Add(factory.GetCharacter('H'));
        row.Add(factory.GetCharacter('e'));
        row.Add(factory.GetCharacter('l'));
        row.Add(factory.GetCharacter('l'));
        row.Add(factory.GetCharacter('o'));
        row.Add(factory.GetCharacter('H'));
        row.Add(factory.GetCharacter('e'));
        row.Add(factory.GetCharacter('l'));
        row.Add(factory.GetCharacter('l'));
        row.Add(factory.GetCharacter('o'));
        row.Add(factory.GetCharacter('H'));
        row.Add(factory.GetCharacter('e'));
        row.Add(factory.GetCharacter('l'));
        row.Add(factory.GetCharacter('l'));
        row.Add(factory.GetCharacter('o'));

        row.Draw(context);
    }

    public static void UseProxy()
    {
        IGraphic image = new ImageProxy("photo.jpg");

        // Изображение ещё не загружено
        Console.WriteLine($"Размер: {image.Width}x{image.Height}");

        // Первый вызов Draw() загружает изображение
        image.Draw();

        // Повторный вызов использует уже загруженный объект
        image.Draw();
    }
}
