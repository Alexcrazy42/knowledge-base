namespace BoardApp.Core;

/// <summary>
/// Эпик - крупная фича, группирующая задачи.
/// </summary>
public sealed class Epic
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Инкрементальный номер В ПРЕДЕЛАХ ДОСКИ. Человекочитаемый ключ = $"EPIC-{Number}".</summary>
    public int Number { get; set; }

    public string Title { get; set; } = "";

    public string Description { get; set; } = "";
}
