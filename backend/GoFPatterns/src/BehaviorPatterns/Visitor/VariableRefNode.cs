namespace Self.Patterns.BehaviorPatterns.Visitor;

// ConcreteElement (VariableRefNode)
public class VariableRefNode : INode
{
    public string VariableName { get; }

    public VariableRefNode(string variableName)
    {
        VariableName = variableName;
    }

    public void Accept(INodeVisitor visitor)
    {
        visitor.Visit(this);
    }
}
