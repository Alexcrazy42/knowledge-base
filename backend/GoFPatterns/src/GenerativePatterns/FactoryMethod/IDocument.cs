namespace Self.Patterns.GenerativePatterns.FactoryMethod;

public interface IDocument
{
    string Name { get; }
    void Open();
    void Save();
}
