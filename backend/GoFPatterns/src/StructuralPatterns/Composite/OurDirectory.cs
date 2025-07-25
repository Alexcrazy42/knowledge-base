namespace Self.Patterns.StructuralPatterns.Composite;

/// <summary>
/// Composite
/// </summary>
public class OurDirectory : IFileSystemItem
{
    public string Name { get; }
    private List<IFileSystemItem> items = new();

    public OurDirectory(string name) => Name = name;
    public void Add(IFileSystemItem item) => items.Add(item);
    public long GetSize() => items.Sum(item => item.GetSize());

    public void Print(string indent = "")
    {
        Console.WriteLine($"{indent}  {Name}");

        foreach (var item in items)
        {
            if (item is OurDirectory directory)
            {
                directory.Print(indent + "  ");
            }
            else if (item is OurFile file)
            {
                Console.WriteLine($"{indent}  {file.Name} ({file.GetSize()} bytes)");
            }
        }
    }
}
