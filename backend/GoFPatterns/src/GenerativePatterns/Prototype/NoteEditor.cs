namespace Self.Patterns.GenerativePatterns.Prototype;

public class NoteEditor
{
    private readonly IMusicNotePrototype prototype;

    public NoteEditor(IMusicNotePrototype prototype)
    {
        this.prototype = prototype;
    }

    public void CreateAndPlayNote()
    {
        var clonedNote = prototype.Clone();
        Console.WriteLine($"Играем {clonedNote.Name} ({clonedNote.Duration} мс)");
    }
}
