using System.Collections;
using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text;


// 1. Через рекурсивную композицию (явное построение)
var manualJson = new JsonObject();
manualJson.AddProperty("title", new JsonValue("Manual JSON"));
manualJson.AddProperty("items", new JsonArray());
Console.WriteLine(manualJson.ToJson());

// 2. Через рефлексивную сериализацию (автоматическое преобразование)
var person = new  {
    Name = "Alice",
    Age = 30,
    Address = new { City = "New York", Zip = 10001 },
    Hobbies = new List<string> { "reading", "hiking" }
};
Console.WriteLine(JsonConverter.ToJson(person));


public interface IJsonNode
{
    string ToJson(int indent = 0);
}

public class JsonValue : IJsonNode
{
    private object value;
    public JsonValue(object value) => this.value = value;
    public string ToJson(int indent = 0) => JsonConverter.SerializePrimitive(value);
}

public class JsonObject : IJsonNode
{
    private Dictionary<string, IJsonNode> properties = new();
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

public class JsonArray : IJsonNode
{
    private List<IJsonNode> items = new();
    public void AddItem(IJsonNode item) => items.Add(item);

    public string ToJson(int indent = 0)
    {
        var sb = new StringBuilder();
        string indentStr = new string(' ', indent * 2);
        sb.Append("[\n");

        bool first = true;
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


public static class JsonConverter
{
    public static string ToJson<T>(T obj) => SerializeValue(obj!, 0);

    private static string SerializeValue(object value, int indent)
    {
        Type type = value.GetType();

        // Примитивы и строки
        if (type.IsPrimitive || type == typeof(string))
        {
            return SerializePrimitive(value);
        }

        // Словари
        if (value is IDictionary dictionary)
        {
            return SerializeDictionary(dictionary, indent);
        }

        // Коллекции
        if (value is IEnumerable enumerable && !(value is string))
        {
            return SerializeArray(enumerable, indent);
        }

        return SerializeObject(value, indent);
    }

    // Методы сериализации (аналогичные предыдущей реализации)...
    public static string SerializePrimitive(object value)
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
            var propValue = prop.GetValue(obj);
            sb.Append($"{innerIndent}\"{prop.Name}\": {SerializeValue(propValue!, indent + 1)}");
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

    private static string EscapeString(string str)
    {
        return str.Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\n", "\\n")
                .Replace("\r", "\\r")
                .Replace("\t", "\\t");
    }
}


