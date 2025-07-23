namespace Self.Patterns.GenerativePatterns.Singleton;

public sealed class SingletonImpl
{
    private static readonly Lazy<SingletonImpl> Instance = new(() => new SingletonImpl());

    private SingletonImpl()
    {
        Console.WriteLine("Произошло создание объекта");
    }

    public static SingletonImpl GetInstance() => Instance.Value;

    public void Log(string message) => Console.WriteLine(message);
}
