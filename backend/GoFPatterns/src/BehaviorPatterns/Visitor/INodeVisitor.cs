namespace Self.Patterns.BehaviorPatterns.Visitor;

// Visitor (NodeVisitor)
public interface INodeVisitor
{
    void Visit(AssignmentNode node);
    void Visit(VariableRefNode node);
    void Visit(ExpressionNode node);
}
