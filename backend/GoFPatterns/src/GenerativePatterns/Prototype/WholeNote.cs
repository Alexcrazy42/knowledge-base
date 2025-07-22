namespace Self.Patterns.GenerativePatterns.Prototype;

/// <summary>
/// Целая нота
/// </summary>
public class WholeNote : IMusicNotePrototype
{
    public string Name => "Целая нота";
    public int Duration => 4000; // 4 секунды

    public IMusicNotePrototype Clone()
    {
        return new WholeNote(); // Возвращаем копию
    }
}
