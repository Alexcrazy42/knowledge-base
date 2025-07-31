namespace Self.Patterns.BehaviorPatterns.Visitor;

// ConcreteElement (AssignmentNode)
public class AssignmentNode : INode
{
    public string VariableName { get; }
    public INode Value { get; }

    public AssignmentNode(string variableName, INode value)
    {
        VariableName = variableName;
        Value = value;
    }

    public void Accept(INodeVisitor visitor)
    {
        visitor.Visit(this);
    }
}
