namespace Self.Patterns.BehaviorPatterns.Observer;

/// <summary>
/// Observer — интерфейс наблюдателя
/// </summary>
public interface IWeatherObserver
{
    void Update(float temperature, float humidity); // Реакция на изменения
}
