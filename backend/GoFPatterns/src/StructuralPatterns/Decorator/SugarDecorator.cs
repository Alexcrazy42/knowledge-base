namespace Self.Patterns.StructuralPatterns.Decorator;

public class SugarDecorator : CoffeeDecorator
{
    public SugarDecorator(ICoffee coffee) : base(coffee) { }

    public override string GetDescription() => Coffee.GetDescription() + ", + сахар";
    public override double GetCost() => Coffee.GetCost() + 0.2;
}
