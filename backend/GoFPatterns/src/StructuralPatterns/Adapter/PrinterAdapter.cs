namespace Self.Patterns.StructuralPatterns.Adapter;

public class PrinterAdapter : IPrinter
{
    private readonly OldPrinter oldPrinter;

    public PrinterAdapter(OldPrinter oldPrinter)
    {
        this.oldPrinter = oldPrinter;
    }

    public void Print(string message)
    {
        oldPrinter.PrintText(message);
    }
}
