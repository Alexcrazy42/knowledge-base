namespace Self.Patterns.BehaviorPatterns.Command;

public interface ICommand
{
    void Execute();
    void Undo(); // Для отмены
}
