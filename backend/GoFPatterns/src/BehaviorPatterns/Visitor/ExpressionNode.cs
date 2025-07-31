namespace Self.Patterns.BehaviorPatterns.Visitor;

// ConcreteElement (ExpressionNode)
public class ExpressionNode : INode
{
    public INode Left { get; }
    public INode Right { get; }

    public ExpressionNode(INode left, INode right)
    {
        Left = left;
        Right = right;
    }

    public void Accept(INodeVisitor visitor)
    {
        visitor.Visit(this);
    }
}
