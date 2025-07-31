namespace Self.Patterns.BehaviorPatterns.Mediator;

/// <summary>
/// Mediator (DialogDirector) — интерфейс посредника
/// </summary>
public interface IDialogDirector
{
    void Notify(Control sender, string eventName);
}
