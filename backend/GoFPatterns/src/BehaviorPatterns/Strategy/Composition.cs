namespace Self.Patterns.BehaviorPatterns.Strategy;

// Context (Composition) - контекст, использующий стратегию
public class Composition
{
    private List<string> components = new List<string>();
    private ICompositor compositor;

    public Composition(ICompositor compositor)
    {
        this.compositor = compositor;
    }

    // Метод для изменения стратегии во время выполнения
    public void SetCompositor(ICompositor compositor)
    {
        this.compositor = compositor;
    }

    public void AddComponent(string component)
    {
        components.Add(component);
    }

    public void Compose()
    {
        // Делегирование работы стратегии
        compositor.Compose(components);
    }
}
