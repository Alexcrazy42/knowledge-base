namespace Self.Patterns.StructuralPatterns.Composite;

/// <summary>
/// Component
/// </summary>
public interface IFileSystemItem
{
    string Name { get; }
    long GetSize();
}
