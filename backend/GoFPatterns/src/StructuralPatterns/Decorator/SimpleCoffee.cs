namespace Self.Patterns.StructuralPatterns.Decorator;

public class SimpleCoffee : ICoffee
{
    public string GetDescription() => "Простой кофе";
    public double GetCost() => 1.0;
}
