namespace Self.Patterns.BehaviorPatterns.State;

public class ConcreteStateB : IState
{
    public void Handle(Context context)
    {
        Console.WriteLine("Обработка в состоянии B. Переход в состояние C.");
        context.State = new ConcreteStateC();
    }
}
