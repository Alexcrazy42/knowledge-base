namespace Self.Patterns.BehaviorPatterns.Strategy;

// ConcreteStrategy - конкретные реализации стратегий
public class SimpleCompositor : ICompositor
{
    public void Compose(List<string> components)
    {
        Console.WriteLine("Простой алгоритм компоновки:");
        Console.WriteLine(string.Join(" ", components));
    }
}
