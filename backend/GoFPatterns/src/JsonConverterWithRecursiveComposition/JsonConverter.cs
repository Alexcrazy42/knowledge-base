using System.Collections;
using System.Reflection;
using System.Text;

public static class JsonConverter
{
    public static string ToJson<T>(T obj) => SerializeValue(obj!, 0);

    internal static string SerializePrimitive(object value)
    {
        if (value is string str)
        {
            return $"\"{EscapeString(str)}\"";
        }

        if (value is bool b)
        {
            return b ? "true" : "false";
        }

        return value.ToString() ?? "null";
    }

    private static string SerializeValue(object value, int indent)
    {
        var type = value.GetType();

        if (type.IsPrimitive || type == typeof(string))
        {
            return SerializePrimitive(value);
        }

        if (value is IDictionary dictionary)
        {
            return SerializeDictionary(dictionary, indent);
        }

        if (value is IEnumerable enumerable)
        {
            return SerializeArray(enumerable, indent);
        }

        return SerializeObject(value, indent);
    }

    private static string SerializeObject(object obj, int indent)
    {
        var sb = new StringBuilder();
        var indentStr = new string(' ', indent * 2);
        var innerIndent = new string(' ', (indent + 1) * 2);

        sb.Append("{\n");
        var first = true;
        foreach (var prop in obj.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!first)
            {
                sb.Append(",\n");
            }
            sb.Append($"{innerIndent}\"{prop.Name}\": {SerializeValue(prop.GetValue(obj)!, indent + 1)}");
            first = false;
        }
        sb.Append($"\n{indentStr}}}");
        return sb.ToString();
    }

    private static string SerializeArray(IEnumerable enumerable, int indent)
    {
        var sb = new StringBuilder();
        var indentStr = new string(' ', indent * 2);
        var innerIndent = new string(' ', (indent + 1) * 2);

        sb.Append("[\n");
        var first = true;
        foreach (var item in enumerable)
        {
            if (!first)
            {
                sb.Append(",\n");
            }
            sb.Append($"{innerIndent}{SerializeValue(item, indent + 1)}");
            first = false;
        }
        sb.Append($"\n{indentStr}]");
        return sb.ToString();
    }

    private static string SerializeDictionary(IDictionary dictionary, int indent)
    {
        var sb = new StringBuilder();
        var indentStr = new string(' ', indent * 2);
        var innerIndent = new string(' ', (indent + 1) * 2);

        sb.Append("{\n");
        var first = true;
        foreach (DictionaryEntry entry in dictionary)
        {
            if (!first)
            {
                sb.Append(",\n");
            }
            sb.Append($"{innerIndent}\"{entry.Key}\": {SerializeValue(entry.Value!, indent + 1)}");
            first = false;
        }
        sb.Append($"\n{indentStr}}}");
        return sb.ToString();
    }

    private static string EscapeString(string str) =>
        str.Replace("\\", "\\\\")
           .Replace("\"", "\\\"")
           .Replace("\n", "\\n")
           .Replace("\r", "\\r")
           .Replace("\t", "\\t");
}
