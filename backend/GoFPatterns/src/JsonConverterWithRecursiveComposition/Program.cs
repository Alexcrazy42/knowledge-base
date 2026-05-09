// 1. Manual construction (explicit Composite tree building)
var manualJson = new JsonObject();
manualJson.AddProperty("title", new JsonValue("Manual JSON"));
manualJson.AddProperty("items", new JsonArray());
Console.WriteLine(manualJson.ToJson());

// 2. Reflective serialization (automatic conversion via JsonConverter)
var person = new
{
    Name = "Alice",
    Age = 30,
    Address = new { City = "New York", Zip = 10001 },
    Hobbies = new List<string> { "reading", "hiking" }
};
Console.WriteLine(JsonConverter.ToJson(person));
