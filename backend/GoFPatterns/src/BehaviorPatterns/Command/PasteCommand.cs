namespace Self.Patterns.BehaviorPatterns.Command;

// Команда "Вставить"
public class PasteCommand : ICommand
{
    private readonly Document document; // Получатель (Receiver)
    private string? previousText; // Для отмены

    public PasteCommand(Document document)
    {
        this.document = document;
    }

    public void Execute()
    {
        previousText = document.Text; // Сохраняем состояние
        document.PasteFromClipboard();
    }

    public void Undo()
    {
        document.Text = previousText; // Восстанавливаем текст
    }
}
