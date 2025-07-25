namespace Self.Patterns.StructuralPatterns.Composite;

/// <summary>
/// Leaf
/// </summary>
public class OurFile : IFileSystemItem
{
    public string Name { get; }
    private readonly long size;

    public OurFile(string name, long size) => (Name, this.size) = (name, size);
    public long GetSize() => size;
}
