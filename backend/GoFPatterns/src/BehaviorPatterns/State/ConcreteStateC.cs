namespace Self.Patterns.BehaviorPatterns.State;

public class ConcreteStateC : IState
{
    public void Handle(Context context)
    {
        Console.WriteLine("Обработка в состоянии C. Переход в состояние A.");
        context.State = new ConcreteStateA();
    }
}
