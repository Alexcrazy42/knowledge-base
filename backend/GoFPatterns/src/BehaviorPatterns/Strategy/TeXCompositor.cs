namespace Self.Patterns.BehaviorPatterns.Strategy;

public class TeXCompositor : ICompositor
{
    public void Compose(List<string> components)
    {
        Console.WriteLine("TeX алгоритм компоновки:");
        Console.WriteLine($"\\begin{{document}}\n{string.Join(" \\par ", components)}\n\\end{{document}}");
    }
}
