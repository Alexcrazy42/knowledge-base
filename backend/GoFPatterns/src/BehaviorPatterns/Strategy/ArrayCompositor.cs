namespace Self.Patterns.BehaviorPatterns.Strategy;

public class ArrayCompositor : ICompositor
{
    public void Compose(List<string> components)
    {
        Console.WriteLine("Алгоритм компоновки в виде массива:");
        Console.WriteLine($"[{string.Join(", ", components)}]");
    }
}
