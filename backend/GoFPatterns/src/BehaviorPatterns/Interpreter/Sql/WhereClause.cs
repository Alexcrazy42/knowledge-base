namespace Self.Patterns.BehaviorPatterns.Interpreter.Sql;

/// <summary>
/// NonterminalExpression (AlternationExpression, SequenceExpression)
/// </summary>
public class WhereClause : ISqlExpression
{
    private readonly List<ISqlExpression> conditions = new();

    public void AddCondition(ISqlExpression condition)
    {
        conditions.Add(condition);
    }

    public void Interpret(SqlContext context)
    {
        foreach (var condition in conditions)
        {
            condition.Interpret(context);
        }
    }
}
