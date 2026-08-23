namespace BoardApp.Core;

/// <summary>
/// Исполнитель (пользователь системы). Лок-фёрст: никакой аутентификации,
/// просто записи в справочнике, которые можно назначать на задачи.
/// </summary>
public sealed class BoardUser
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = "";

    /// <summary>HEX-цвет аватарки, например "#e91e63". Если не задан - берётся из палитры.</summary>
    public string Color { get; set; } = "#7986cb";
}
