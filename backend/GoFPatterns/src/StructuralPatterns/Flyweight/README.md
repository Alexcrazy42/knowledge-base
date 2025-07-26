# Приспособленец

Проблемы, которые решает:
высокое потребление памяти из за большого количества похожих объектов
дублирование данных, когда множество объектов содержат одинаковые состояния
неээфективность при работе с множеством мелких объектов (например, символы в текстовом редакторе)

суть паттерна:
разделение состояния объекта на:
внутренне - неизменяемое, общее для многих объектов (например, код символа, шрифт)
внешнее - изменяемое, уникальное для каждого объекта (например, позиция символа в тексте)


## Применение в библиотеках .NET

применяется для оптимизации работы с памятью, особенно когда нужно поддерживать множество объектов с общими
состояниями.

String.Intern - пул строк
В .NET строки неизменяемы, и CLR использует пул интернированных строк, чтобы избежать дублирования одинаковых
строк в памяти.

```csharp
string s1 = "Hello";
string s2 = "Hello";
string s3 = string.Intern(new StringBuilder().Append("He").Append("llo").ToString());

Console.WriteLine(ReferenceEquals(s1, s2)); // True (одна и та же ссылка)
Console.WriteLine(ReferenceEquals(s1, s3)); // True (интернированная строка)
```


System.Drawing
В GDI+ (библиотека System.Drawing) такие объекты, как Font, Brush и Pen, часто кешируются для повторного
использования.

```csharp
var font1 = new Font("Arial", 12);
var font2 = new Font("Arial", 12); // Создаёт новый объект, но внутри может кешироваться

// Оптимизация через статические экземпляры:
Brush sharedBrush = Brushes.Black; // Готовый экземпляр (Flyweight)
```

WPF (StaticResource и кеширование стилей)


В WPF ресурсы (StaticResource) и стили применяются как общие объекты, а не создаются заново для каждого элемента.

```xml
<Window.Resources>
    <SolidColorBrush x:Key="SharedBrush" Color="Red"/> <!-- Flyweight -->
</Window.Resources>

<Button Background="{StaticResource SharedBrush}"/>
<TextBlock Foreground="{StaticResource SharedBrush}"/>
```


ASP.NET Core (IOptions<T> и кеширование конфигурации)

Конфигурационные объекты (например, IOptions<AppSettings>) создаются один раз и затем используются как
единый экземпляр.

```csharp
services.Configure<AppSettings>(Configuration.GetSection("AppSettings")); // Регистрация

// Где-то в контроллере:
public HomeController(IOptions<AppSettings> options) // Внедрение общего экземпляра
```


System.Text.RegularExpressions — кеширование regex

При компиляции регулярных выражений .NET кеширует их для повторного использования.
Скомпилированные regex-шаблоны хранятся в памяти и переиспользуются.

```csharp
var regex1 = new Regex(@"\d+", RegexOptions.Compiled);
var regex2 = new Regex(@"\d+", RegexOptions.Compiled); // Использует закешированный шаблон
```

Microsoft.Extensions.ObjectPool
Библиотека для пулинга объектов (например, StringBuilder, byte[]), чтобы избежать частых созданий/удалений.
Пул содержит набор готовых объектов, которые разделяются между клиентами.

```csharp
var pool = new DefaultObjectPool<StringBuilder>(new StringBuilderPooledPolicy());

var sb = pool.Get(); // Берём из пула
try {
    sb.Append("Hello");
}
finally {
    pool.Return(sb); // Возвращаем для повторного использования
}
```

## Где еще встречаются:
Кеширование (например, MemoryCache).
Синглтоны (AddSingleton в DI-контейнере).
Иммутабельные структуры (DateTime, TimeSpan).

Если объект неизменяемый и часто используется, .NET старается оптимизировать его через Flyweight-подход.
