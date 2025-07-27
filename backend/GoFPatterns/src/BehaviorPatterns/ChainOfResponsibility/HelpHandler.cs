namespace Self.Patterns.BehaviorPatterns.ChainOfResponsibility;

public abstract class HelpHandler
{
    protected readonly HelpHandler? Successor; // Ссылка на следующий обработчик

    public HelpHandler(HelpHandler? successor = null)
    {
        Successor = successor;
    }

    public virtual void HandleHelp(string request)
    {
        Successor?.HandleHelp(request);
    }
}
