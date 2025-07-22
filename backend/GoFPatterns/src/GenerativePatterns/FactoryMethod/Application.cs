namespace Self.Patterns.GenerativePatterns.FactoryMethod;

public abstract class Application
{
    // Фабричный метод
    public abstract IDocument CreateDocument(string name);

    // Дополнительная логика
    public void NewDocument(string name)
    {
        Console.WriteLine($"Создаем новый документ в {this.GetType().Name}");
        var doc = CreateDocument(name);
        doc.Save();
    }
}
