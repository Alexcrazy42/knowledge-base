namespace Self.Patterns.StructuralPatterns.Bridge;

// RefinedAbstraction
public class IconWindow : Window
{
    public IconWindow(IWindowImpl impl) : base(impl) { }

    public override void Draw()
    {
        Impl.DrawBorder();
        Impl.DrawText("[Icon]");
    }
}
