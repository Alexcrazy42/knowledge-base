using Self.Patterns.StructuralPatterns.Adapter;
using Self.Patterns.StructuralPatterns.Bridge;
using Self.Patterns.StructuralPatterns.Composite;
using Self.Patterns.StructuralPatterns.Decorator;
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
}
