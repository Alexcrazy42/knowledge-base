using System.Text;

namespace Self.Patterns.BehaviorPatterns.Interpreter.Sql;

/// <summary>
/// Context
/// </summary>
public class SqlContext
{
    public StringBuilder Query { get; } = new();

    public void AddCondition(string condition)
    {
        if (Query.Length == 0)
        {
            Query.Append($"WHERE {condition}");
        }
        else
        {

            Query.Append($" AND {condition}");
        }
    }
}
