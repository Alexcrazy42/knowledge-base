namespace Self.Patterns.BehaviorPatterns.Visitor;

// ObjectStructure (Program)
public class ProgramAst
{
    private readonly List<INode> nodes = new();

    public void AddNode(INode node)
    {
        nodes.Add(node);
    }

    public void Accept(INodeVisitor visitor)
    {
        foreach (var node in nodes)
        {
            node.Accept(visitor);
        }
    }
}
