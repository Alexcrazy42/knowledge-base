namespace Self.Patterns.GenerativePatterns.Prototype;

/// <summary>
/// Интерфейс прототипа
/// </summary>
public interface IMusicNotePrototype
{
    string Name { get; }
    int Duration { get; } // Длительность в миллисекундах
    IMusicNotePrototype Clone();
}
