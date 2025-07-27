namespace Self.Patterns.BehaviorPatterns.Command;

public class OpenCommand : ICommand
{
    private readonly Application app; // Получатель (Receiver)

    public OpenCommand(Application app)
    {
        this.app = app;
    }

    public void Execute()
    {
        app.OpenDocument();
    }

    public void Undo()
    {
        app.CloseDocument(); // Упрощённая отмена
    }
}
