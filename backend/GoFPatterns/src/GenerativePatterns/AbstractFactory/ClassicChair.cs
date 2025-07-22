namespace Self.Patterns.GenerativePatterns.AbstractFactory;

public class ClassicChair : IChair
{
    public void SitOn()
    {
        Console.WriteLine("Сидим на классик стуле");
    }
}
