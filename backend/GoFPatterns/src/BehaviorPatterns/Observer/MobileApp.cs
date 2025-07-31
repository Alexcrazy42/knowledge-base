namespace Self.Patterns.BehaviorPatterns.Observer;

/// <summary>
/// Наблюдатель 1: Мобильное приложение
/// </summary>
public class MobileApp : IWeatherObserver
{
    public void Update(float temperature, float humidity)
    {
        Console.WriteLine($"Mobile: Temp = {temperature}°C, Hum = {humidity}%");
    }
}
