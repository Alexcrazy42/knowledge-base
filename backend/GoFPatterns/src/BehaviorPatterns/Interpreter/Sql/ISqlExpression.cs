namespace Self.Patterns.BehaviorPatterns.Interpreter.Sql;

/// <summary>
/// AbstractExpression (RegularExpression)
/// </summary>
public interface ISqlExpression
{
    void Interpret(SqlContext context);
}
