namespace Self.Patterns.BehaviorPatterns.State;

public class ConcreteStateA : IState
{
    public void Handle(Context context)
    {
        Console.WriteLine("Обработка в состоянии A. Переход в состояние B.");
        context.State = new ConcreteStateB();
    }
}
