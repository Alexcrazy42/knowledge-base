namespace Self.Patterns.BehaviorPatterns.Command;

/// <summary>
/// Reveiver
/// </summary>
public class Application
{
    public void OpenDocument()
    {
        Console.WriteLine("Документ открыт");
    }

    public void CloseDocument()
    {
        Console.WriteLine("Документ закрыт");
    }
}
