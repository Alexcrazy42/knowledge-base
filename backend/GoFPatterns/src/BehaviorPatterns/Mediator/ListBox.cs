namespace Self.Patterns.BehaviorPatterns.Mediator;

public class ListBox : Control
{
    public string? SelectedItem { get; set; }

    public void SelectItem(string item)
    {
        SelectedItem = item;
        Changed("SelectionChanged"); // Уведомляем посредника
    }
}
