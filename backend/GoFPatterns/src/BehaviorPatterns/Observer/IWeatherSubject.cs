namespace Self.Patterns.BehaviorPatterns.Observer;

/// <summary>
/// Subject — интерфейс субъекта
/// </summary>
public interface IWeatherSubject
{
    void Attach(IWeatherObserver observer); // Подписать наблюдателя
    void Detach(IWeatherObserver observer); // Отписать наблюдателя
    void Notify();                         // Уведомить всех
}
