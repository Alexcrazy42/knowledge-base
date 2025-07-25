namespace Self.Patterns.StructuralPatterns.Decorator;

public abstract class CoffeeDecorator : ICoffee
{
    protected readonly ICoffee Coffee;

    public CoffeeDecorator(ICoffee coffee) => Coffee = coffee;

    public virtual string GetDescription() => Coffee.GetDescription();
    public virtual double GetCost() => Coffee.GetCost();
}
