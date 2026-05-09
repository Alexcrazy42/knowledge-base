public sealed class JsonValue(object value) : IJsonNode
{
    public string ToJson(int indent = 0) => JsonConverter.SerializePrimitive(value);
}
