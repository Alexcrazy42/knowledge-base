namespace Self.Patterns.StructuralPatterns.Bridge;

// Abstraction
public abstract class Window
{
    protected IWindowImpl Impl;

    public Window(IWindowImpl impl)
    {
        Impl = impl;
    }

    public abstract void Draw();
}
