namespace Self.Patterns.GenerativePatterns.AbstractFactory;

public class ClassicFurnitureFactory : IFurnitureFactory
{
    public IChair CreateChair()
    {
        return new ClassicChair();
    }

    public ISofa CreateSofa()
    {
        return new ClassicSofa();
    }
}
