# Цепочка обязанностей

Проблемы:
1. избежание жесткой привязки отправителя запроса к его обработчику
2. динамическое определение того, какой объект должен обработать запрос
3. упрощение добавления новых обработчиков без изменения существующего кода

запрос передаетсвя по цепочке обработчиков, пока один из них не обработает его. каждый обработчик решает: обработать
запрос самому или передать дальше


# Примеры из .NET

ASP.NET Core Middleware
```csharp
public class Startup
{
    public void Configure(IApplicationBuilder app)
    {
        app.UseMiddleware<LoggingMiddleware>(); // 1-й обработчик
        app.UseMiddleware<AuthMiddleware>();    // 2-й обработчик
        app.UseRouting();                       // 3-й обработчик
    }
}

// Middleware 1: Логирование
public class LoggingMiddleware
{
    private readonly RequestDelegate _next;
    public LoggingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        Console.WriteLine("Запрос получен");
        await _next(context); // Передаём дальше
    }
}

// Middleware 2: Проверка авторизации
public class AuthMiddleware
{
    private readonly RequestDelegate _next;

    public AuthMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.User.Identity.IsAuthenticated)
            context.Response.StatusCode = 401; // Не авторизован
        else
            await _next(context); // Передаём дальше
    }
}
```


Обработчики событий в WinForms/WPF

События UI (например, клик мыши) могут "всплывать" от дочерних элементов к родительским.

```csharp
<!-- XAML: Иерархия элементов -->
<Window x:Class="MyApp.MainWindow" PreviewMouseDown="Window_PreviewMouseDown">
    <StackPanel PreviewMouseDown="StackPanel_PreviewMouseDown">
        <Button PreviewMouseDown="Button_PreviewMouseDown" Content="Click me"/>
    </StackPanel>
</Window>
```

```csharp
private void Button_PreviewMouseDown(object sender, MouseButtonEventArgs e)
{
    Console.WriteLine("Кнопка обработала событие");
    // e.Handled = true; // Если true — остановит цепочку
}

private void StackPanel_PreviewMouseDown(object sender, MouseButtonEventArgs e)
{
    Console.WriteLine("StackPanel получил событие");
}

private void Window_PreviewMouseDown(object sender, MouseButtonEventArgs e)
{
    Console.WriteLine("Окно получило событие");
}
```


System.Security.Claims
Цепочка обработчиков аутентификации проверяет запрос (JWT, куки, OAuth).

```csharp
services.AddAuthentication()
    .AddJwtBearer()  // 1-й обработчик
    .AddCookie();    // 2-й обработчик
```


Логирование (ILogger)
Логгеры (консоль, файл, БД) могут обрабатывать сообщения по цепочке.

```csharp
var loggerFactory = LoggerFactory.Create(builder =>
{
    builder.AddConsole(); // 1-й обработчик
    builder.AddFile("log.txt"); // 2-й обработчик
});

ILogger logger = loggerFactory.CreateLogger<Program>();
logger.LogError("Ошибка!"); // Сообщение проходит через все логгеры
```


Exception Filters в ASP.NET Core
Фильтры исключений вызываются последовательно.


```csharp
public class CustomExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is NullReferenceException)
        {
            context.Result = new BadRequestResult(); // Обработали
            context.ExceptionHandled = true; // Остановка цепочки
        }
        // Иначе исключение передаётся следующему фильтру
    }
}
```

Message Handlers в HttpClient
Цепочка обработчиков для HTTP-запросов (например, для логирования, retry-логики).


```csharp
public class LoggingHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        Console.WriteLine($"Запрос: {request.Method} {request.RequestUri}");
        return await base.SendAsync(request, cancellationToken); // Передаём дальше
    }
}

// Настройка HttpClient:
var handler = new HttpClientHandler();
var loggingHandler = new LoggingHandler { InnerHandler = handler };
var client = new HttpClient(loggingHandler);
```
