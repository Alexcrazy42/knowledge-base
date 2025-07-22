namespace Self.Patterns.GenerativePatterns.Prototype;

/// <summary>
/// Целая нота
/// </summary>
public class HalfNote : IMusicNotePrototype
{
    public string Name => "Половинная нота";
    public int Duration => 2000; // 2 секунды

    public IMusicNotePrototype Clone()
    {
        return new HalfNote();
    }
}
