# Стратегия

Избегание жестко закодированных алгоритмов - когда в коде присутствует
множество условных операторов для выбора разных вариантов поведения

Необходимость динамической смены алгоритмов во время исполнения

Изоляция сложных алгоритмов от клиентсокго кода

Устранение дублирования кода когда несколько классов отличаются только
поведением

Упрощение добавления новых алгоритмов без изменения существующего кода

TeXCompositor


# Применение в .NET библиотеках

Сортировка и сравнение объектов
IComparer<T> и Array.Sort / List.Sort
Проблема: Разные алгоритмы сортировки для одних и тех же данных.
Решение: IComparer<T> — это стратегия для сравнения объектов.

Где используется: Коллекции (List<T>, Array), LINQ (OrderBy).

```csharp
string[] names = { "Alice", "Bob", "Charlie" };

// Стратегия сортировки по длине строки
Array.Sort(names, new ByLengthComparer());

class ByLengthComparer : IComparer<string>
{
    public int Compare(string x, string y) => x.Length.CompareTo(y.Length);
}
```


Форматирование данных
IFormatProvider и ICustomFormatter
Проблема: Разные форматы вывода чисел, дат и строк.
Решение: Стратегии форматирования через ToString(formatProvider).
Где используется: DateTime.ToString(), NumberFormatInfo, CultureInfo.

```csharp
double value = 1234.567;
Console.WriteLine(value.ToString("C", new CultureInfo("en-US"))); // $1,234.57
Console.WriteLine(value.ToString("C", new CultureInfo("ru-RU"))); // 1 234,57 ₽
```

HTTP-запросы в ASP.NET Core
IHttpClientFactory и политики (Polly)
Проблема: Разные стратегии обработки ошибок (повторы, таймауты).
Решение: Политики Polly — это стратегии для HTTP-вызовов.

```csharp
services.AddHttpClient("GitHub")
        .AddTransientHttpErrorPolicy(policy =>
            policy.WaitAndRetryAsync(3, _ => TimeSpan.FromSeconds(2)));
```

Логирование (ILogger)
Поставщики логирования (Console, File, Azure)
Проблема: Куда писать логи (консоль, файл, облако).
Решение: ILoggerProvider — стратегия вывода.

```csharp
ILoggerFactory loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole(); // Стратегия для консоли
    builder.AddFile("logs.txt"); // Стратегия для файла
});
```


Аутентификация в ASP.NET Core
IAuthenticationHandler (Cookie, JWT, OAuth)
Проблема: Разные способы аутентификации.
Решение: Каждая схема (AddCookie, AddJwtBearer) — стратегия.

```csharp
services.AddAuthentication()
        .AddCookie()    // Стратегия Cookie
        .AddJwtBearer(); // Стратегия JWT
```
