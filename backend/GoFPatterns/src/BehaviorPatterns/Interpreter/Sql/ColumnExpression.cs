namespace Self.Patterns.BehaviorPatterns.Interpreter.Sql;

/// <summary>
/// TerminalExpression (LiteralExpression)
/// </summary>
public class ColumnExpression : ISqlExpression
{
    private readonly string columnName;
    private readonly string value;

    public ColumnExpression(string columnName, string value)
    {
        this.columnName = columnName;
        this.value = value;
    }

    public void Interpret(SqlContext context)
    {
        context.AddCondition($"{columnName} = '{value}'");
    }
}
