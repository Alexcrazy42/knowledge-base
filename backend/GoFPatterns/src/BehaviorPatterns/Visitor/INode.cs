namespace Self.Patterns.BehaviorPatterns.Visitor;

// Element (Node)
public interface INode
{
    void Accept(INodeVisitor visitor);
}
