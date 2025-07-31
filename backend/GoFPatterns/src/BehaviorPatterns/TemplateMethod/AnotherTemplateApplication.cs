namespace Self.Patterns.BehaviorPatterns.TemplateMethod;

public class AnotherTemplateApplication : TemplateApplication
{
    protected override void ProcessData()
    {
        Console.WriteLine("Альтернативный способ обработки данных");
    }
}
