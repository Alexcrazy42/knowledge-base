namespace Self.Patterns.BehaviorPatterns.Mediator;

/// <summary>
/// Colleague (ListBox, EntryField) — классы-коллеги
/// </summary>
public abstract class Control
{
    public IDialogDirector? Director { get; set; }

    protected void Changed(string eventName)
    {
        Director?.Notify(this, eventName);
    }
}
