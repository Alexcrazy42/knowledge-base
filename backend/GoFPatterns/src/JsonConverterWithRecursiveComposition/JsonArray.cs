using System.Text;

public sealed class JsonArray : IJsonNode
{
    private readonly List<IJsonNode> items = new();

    public void AddItem(IJsonNode item) => items.Add(item);

    public string ToJson(int indent = 0)
    {
        var sb = new StringBuilder();
        var indentStr = new string(' ', indent * 2);

        sb.Append("[\n");
        var first = true;
        foreach (var item in items)
        {
            if (!first)
            {
                sb.Append(",\n");
            }
            sb.Append($"{indentStr}  {item.ToJson(indent + 1)}");
            first = false;
        }
        sb.Append($"\n{indentStr}]");
        return sb.ToString();
    }
}
