namespace Self.Patterns.BehaviorPatterns.Observer;

/// <summary>
/// ConcreteObserver - конкретный наблюдатель
/// </summary>
public class SmartHome : IWeatherObserver
{
    public void Update(float temperature, float humidity)
    {
        if (temperature > 30)
        {
            Console.WriteLine("SmartHome: Включить кондиционер!");
        }
    }
}
