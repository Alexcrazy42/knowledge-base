namespace Self.Patterns.BehaviorPatterns.Interpreter.Arithmetic;

public class AddExpression : IMathExpression
{
    private readonly IMathExpression left;
    private readonly IMathExpression right;

    public AddExpression(IMathExpression left, IMathExpression right)
    {
        this.left = left;
        this.right = right;
    }

    public int Interpret() => left.Interpret() + right.Interpret();
}

public class MultiplyExpression : IMathExpression
{
    private readonly IMathExpression left;
    private readonly IMathExpression right;

    public MultiplyExpression(IMathExpression left, IMathExpression right)
    {
        this.left = left;
        this.right = right;
    }

    public int Interpret() => left.Interpret() * right.Interpret();
}
