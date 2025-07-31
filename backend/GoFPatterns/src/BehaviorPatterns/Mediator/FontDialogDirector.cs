namespace Self.Patterns.BehaviorPatterns.Mediator;

/// <summary>
/// ConcreteMediator (FontDialogDirector) — конкретный посредник
/// </summary>
public class FontDialogDirector : IDialogDirector
{
    private ListBox fontList;
    private EntryField fontEntry;

    public FontDialogDirector(ListBox listBox, EntryField entryField)
    {
        fontList = listBox;
        fontList.Director = this;

        fontEntry = entryField;
        fontEntry.Director = this;
    }

    public void Notify(Control sender, string eventName)
    {
        if (sender == fontList && eventName == "SelectionChanged")
        {
            // Когда выбрали шрифт в списке — обновляем поле ввода
            fontEntry.Text = fontList.SelectedItem;
        }
        else if (sender == fontEntry && eventName == "TextChanged")
        {
            // Когда текст в поле изменился — ищем в списке
            fontList.SelectedItem = fontEntry.Text;
        }
    }
}
