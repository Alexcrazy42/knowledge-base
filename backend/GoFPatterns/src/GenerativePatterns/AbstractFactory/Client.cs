namespace Self.Patterns.GenerativePatterns.AbstractFactory;

public class Client
{
    private readonly IChair chair;
    private readonly ISofa sofa;

    public Client(IFurnitureFactory factory)
    {
        chair = factory.CreateChair();
        sofa = factory.CreateSofa();
    }

    public void UseFurniture()
    {
        chair.SitOn();
        sofa.LieOn();
    }
}
