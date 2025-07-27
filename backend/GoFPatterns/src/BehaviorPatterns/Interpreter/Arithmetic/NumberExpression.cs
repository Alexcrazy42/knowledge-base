namespace Self.Patterns.BehaviorPatterns.Interpreter.Arithmetic;

/// <summary>
/// TerminalExpression
/// </summary>
public class NumberExpression : IMathExpression
{
    private readonly int number;

    public NumberExpression(int number)
    {
        this.number = number;
    }

    public int Interpret() => number;
}
