namespace Self.Patterns.BehaviorPatterns.State;

public interface IState
{
    void Handle(Context context);
}
