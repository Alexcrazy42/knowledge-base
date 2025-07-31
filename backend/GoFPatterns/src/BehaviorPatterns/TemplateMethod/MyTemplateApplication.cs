namespace Self.Patterns.BehaviorPatterns.TemplateMethod;

// ConcreteClass (MyApplication)
public class MyTemplateApplication : TemplateApplication
{
    protected override void Initialize()
    {
        base.Initialize(); // Можно вызвать базовую реализацию
        Console.WriteLine("Дополнительная инициализация для MyApplication");
    }

    protected override void ProcessData()
    {
        Console.WriteLine("Обработка данных специальным образом в MyApplication");
    }

    protected override void SaveResults()
    {
        Console.WriteLine("Сохранение результатов в облачное хранилище");
        // Можно добавить дополнительную логику
    }
}
