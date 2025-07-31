namespace Self.Patterns.BehaviorPatterns.State;

public class Context
{
    private IState state;

    public Context(IState state)
    {
        this.state = state;
    }

    // Свойство для изменения состояния
    public IState State
    {
        get { return state; }
        set
        {
            state = value;
            Console.WriteLine($"Состояние изменено на: {state.GetType().Name}");
        }
    }

    // Запрос, который делегируется текущему состоянию
    public void Request()
    {
        state.Handle(this);
    }
}
