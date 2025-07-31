namespace Self.Patterns.BehaviorPatterns.Visitor;

// ConcreteVisitor (TypeCheckingVisitor)
public class TypeCheckingVisitor : INodeVisitor
{
    private readonly Dictionary<string, Type> variableTypes = new();

    public void Visit(AssignmentNode node)
    {
        Console.WriteLine($"Checking assignment to {node.VariableName}");
        node.Value.Accept(this);
        // Здесь могла бы быть логика проверки типов
    }

    public void Visit(VariableRefNode node)
    {
        Console.WriteLine($"Checking reference to variable {node.VariableName}");
        if (!variableTypes.ContainsKey(node.VariableName))
        {
            throw new Exception($"Variable {node.VariableName} not declared");
        }
    }

    public void Visit(ExpressionNode node)
    {
        Console.WriteLine("Checking expression");
        node.Left.Accept(this);
        node.Right.Accept(this);
    }
}
