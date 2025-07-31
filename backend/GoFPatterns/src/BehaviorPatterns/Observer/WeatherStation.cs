namespace Self.Patterns.BehaviorPatterns.Observer;

/// <summary>
/// ConcreteSubject — конкретный субъект (метеостанция)
/// </summary>
public class WeatherStation : IWeatherSubject
{
    private List<IWeatherObserver> observers = new();
    private float temperature;
    private float humidity;

    public void SetMeasurements(float temperature, float humidity)
    {
        this.temperature = temperature;
        this.humidity = humidity;
        Notify(); // Уведомляем наблюдателей
    }

    public void Attach(IWeatherObserver observer) => observers.Add(observer);
    public void Detach(IWeatherObserver observer) => observers.Remove(observer);

    public void Notify()
    {
        foreach (var observer in observers)
        {
            observer.Update(temperature, humidity);
        }
    }
}
