namespace Self.Patterns.BehaviorPatterns.Command;

/// <summary>
/// Invoker
/// </summary>
public class MenuItem
{
    private ICommand? command;

    public void SetCommand(ICommand command)
    {
        this.command = command;
    }

    public void Click()
    {
        command?.Execute();
    }
}
