# Другие паттерны не затронутые в книге

1. Fluent Interface (метод цепочки)


2. удобное использование Action
```csharp
services.AddHttpClient("GitHubClient", client =>
{
    client.BaseAddress = new Uri("https://api.github.com");
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

public static IHttpClientBuilder AddHttpClient(
    this IServiceCollection services,
    string name,
    Action<HttpClient> configureClient // Вот этот параметр
)

Action<HttpClient> configureClient = client =>
{
    client.BaseAddress = new Uri("https://api.github.com");
    // ... другие настройки
};
```


# in и out

Понятия описывают как наследование типов влияет на совместимость обобщенных типов и делегатов.
Они позволяют безопасно работать с производными типами там, где ожидаются базовые и наоборот

## Ковариантность (out) - позволяет использовать более производные тип вместого базового в
возвращаемых значениях

Работает только для возвращаемых значений (методы, свойства).
Пример:
```csharp
IEnumerable<out T>
Func<out TResult>
IEnumerable<out T>

IEnumerable<string> strings = new List<string> { "a", "b" };
IEnumerable<object> objects = strings; // Безопасно, так как string → object
```

## Контрвариантность (in) - позволяет использовать более базовый тип вместо производного во
входных параметрах

Работает только для входных параметров
```csharp
Action<in T>
IComparer<in T>
Predicate<in T>

Action<object> logObject = obj => Console.WriteLine(obj);
Action<string> logString = logObject; // Безопасно, так как object ← string
logString("Hello"); // Работает!
```

## Инвариантность - когда не используется in/out

out
1. для инициализации в методе

2. Для обобщенных интерфейсов (ковариантность)
Позволяет использовать более производный тип (например, IEnumerable<Cat> как IEnumerable<Animal>)

Применяется только к возвращаемым значениям (T в out T).
```csharp
interface IProducer<out T>
{
    T Produce();
}

IProducer<Cat> catProducer = new CatProducer();
IProducer<Animal> animalProducer = catProducer; // Безопасно, так как Cat — подтип Animal
```

in
1. для параметров методов
параметр передает по ссылке, но не может быть изменен внутри метода
улучшает производительность для больших структур (избегает копиррования)

```csharp
void PrintCoordinates(in Point p)
{
    // p.X = 10; // Ошибка: параметр 'in' нельзя изменить
    Console.WriteLine($"{p.X}, {p.Y}");
}

var point = new Point(1, 2);
PrintCoordinates(in point); // Явная передача (можно без 'in')
```

2. Для обобщенных интерфейсов (контрвариантность)
позволяет использовать более базовый тип (например Action<Animal> как Action<Cat>)
Применяется только к входным параметрам (T в in T).

```csharp
interface IConsumer<in T>
{
    void Consume(T item);
}

IConsumer<Animal> animalConsumer = new AnimalConsumer();
IConsumer<Cat> catConsumer = animalConsumer; // Безопасно, так как Consumer<Animal> может принять Cat
```
