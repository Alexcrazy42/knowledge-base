namespace Self.Patterns.StructuralPatterns.Decorator;

// Конкретные декораторы
public class MilkDecorator : CoffeeDecorator
{
    public MilkDecorator(ICoffee coffee) : base(coffee) { }

    public override string GetDescription() => Coffee.GetDescription() + ", + молоко";
    public override double GetCost() => Coffee.GetCost() + 0.5;
}
