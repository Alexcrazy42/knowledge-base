namespace Self.Patterns.StructuralPatterns.Flyweight;

/// <summary>
/// FlyweightFactory — фабрика символов
/// </summary>
public class GlyphFactory
{
    private readonly Dictionary<char, Character> characters = new();

    public Character GetCharacter(char c)
    {
        if (!characters.ContainsKey(c))
        {
            characters[c] = new Character(c); // Создаём новый или берём существующий
        }
        return characters[c];
    }
}
