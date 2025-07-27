namespace Self.Patterns.BehaviorPatterns.Command;

/// <summary>
/// Receiver
/// </summary>
public class Document
{
    public string? Text { get; set; }

    public void PasteFromClipboard()
    {
        Text += "[Текст из буфера]";
        Console.WriteLine("Текст вставлен: " + Text);
    }
}
