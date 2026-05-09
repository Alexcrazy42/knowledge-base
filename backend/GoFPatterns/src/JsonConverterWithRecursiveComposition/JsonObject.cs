using System.Text;

public sealed class JsonObject : IJsonNode
{
    private readonly Dictionary<string, IJsonNode> properties = new();

    public void AddProperty(string key, IJsonNode value) => properties[key] = value;

    public string ToJson(int indent = 0)
    {
        var sb = new StringBuilder();
        var indentStr = new string(' ', indent * 2);

        sb.Append("{\n");
        var first = true;
        foreach (var prop in properties)
        {
            if (!first)
            {
                sb.Append(",\n");
            }
            sb.Append($"{indentStr}  \"{prop.Key}\": {prop.Value.ToJson(indent + 1)}");
            first = false;
        }
        sb.Append($"\n{indentStr}}}");
        return sb.ToString();
    }
}
