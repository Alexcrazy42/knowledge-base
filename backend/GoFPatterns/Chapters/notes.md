# Библиотека Shouldly

```csharp
string name = "Piter";
name.Should().Be("Piter");
name.Should().NotBe("John");
string? nullName = null;
nullName.Should().BeNull();
```

Этот синтаксис использует Fluent Interface (цепочка вызовов) в сочетании с Method Chaining
(метод цепочки). Такой подход часто применяется в библиотеках для утверждений

1. Создать базовый класс/интерфейс для "строителя" утверждений
```csharp
public class ShouldlyAssertion<T>
{
    private readonly T _actual;

    public ShouldlyAssertion(T actual)
    {
        _actual = actual;
    }

    public void Be(T expected)
    {
        if (!_actual.Equals(expected))
            throw new AssertionException($"Expected: {expected}, but was: {_actual}");
    }

    public void NotBe(T expected)
    {
        if (_actual.Equals(expected))
            throw new AssertionException($"Expected not to be: {expected}, but it was");
    }

    public void BeNull()
    {
        if (_actual != null)
            throw new AssertionException($"Expected: null, but was: {_actual}");
    }
}
```

2. Создать extension-метод для запуска цепочки
```csharp
public static class ShouldlyExtensions
{
    public static ShouldlyAssertion<T> Should<T>(this T actual)
    {
        return new ShouldlyAssertion<T>(actual);
    }
}
```


# Библиотека Moq

Паттерн Proxy
1. Динамические прокси (DynamicProxy)
Moq использует библиотеку Castle DynamicProxy для генерации прокси-классов в рантайме:

```csharp
public interface IService { string GetData(); }

var mock = new Mock<IService>();
mock.Setup(x => x.GetData()).Returns("test");

// Под капотом создается примерно такой класс:
class IServiceProxy : IService
{
    private readonly MockBehavior _behavior;

    public string GetData()
    {
        if (_behavior == MockBehavior.Strict)
            throw new MockException("Неожиданный вызов");
        return "test"; // Ваш Setup
    }
}
```

2. Expression Trees (деревья выражений)
Moq анализует лямбда-выражения для настройки mock-ов:
```csharp
mock.Setup(x => x.GetData(It.IsAny<int>())) // <- Это выражение разбирается
   .Returns(42);
```

3. как работает Setup

Когда мы пишем код:
```csharp
mock.Setup(x => x.GetData()).Returns("Hello");
```

Происходит следующее:
разбор выражения: Moq анализирует x => x.GetData() как Expression<Func<IService, string>>
создание конфигурации: запоминает, что при вызове GetData нужно вернуть "hello"
генерация прокси: DynamicProxy создает класс-заглушку
