namespace Self.Patterns.BehaviorPatterns.Mediator;

public class EntryField : Control
{
    public string? Text { get; set; }

    public void SetText(string text)
    {
        Text = text;
        Changed("TextChanged"); // Уведомляем посредника
    }
}
