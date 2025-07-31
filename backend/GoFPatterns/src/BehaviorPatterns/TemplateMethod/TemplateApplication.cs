namespace Self.Patterns.BehaviorPatterns.TemplateMethod;

// AbstractClass (Application)
public abstract class TemplateApplication
{
    // Шаблонный метод, определяющий скелет алгоритма
    public void Run()
    {
        Initialize();
        ProcessData();
        SaveResults();
        CleanUp();
    }

    // Общая реализация (может быть переопределена при необходимости)
    protected virtual void Initialize()
    {
        Console.WriteLine("Общая инициализация приложения");
    }

    // Абстрактный метод - должен быть реализован в подклассах
    protected abstract void ProcessData();

    // Метод с реализацией по умолчанию (может быть переопределен)
    protected virtual void SaveResults()
    {
        Console.WriteLine("Сохранение результатов в базе данных");
    }

    // Общая реализация (не может быть переопределена)
    private void CleanUp()
    {
        Console.WriteLine("Очистка ресурсов приложения");
    }
}
