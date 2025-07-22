namespace Self.Patterns.GenerativePatterns.AbstractFactory;

public interface IFurnitureFactory
{
    IChair CreateChair();
    ISofa CreateSofa();
}
