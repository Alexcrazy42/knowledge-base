using Self.Patterns.StructuralPatterns.Adapter;
using Self.Patterns.StructuralPatterns.Bridge;

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
}
