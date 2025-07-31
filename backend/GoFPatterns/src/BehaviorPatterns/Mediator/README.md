# Посредник

Решаемые проблемы:
уменьшение связанности между компонентами
упрощение взаимодействия в сложных системах
централизация управления

Библиотеки .NET:

MediatR

```csharp
// Команда
public record CreateUserCommand(string Name) : IRequest<Guid>;

// Обработчик
public class CreateUserHandler : IRequestHandler<CreateUserCommand, Guid>
{
    public Task<Guid> Handle(CreateUserCommand request, CancellationToken ct)
    {
        return Task.FromResult(Guid.NewGuid());
    }
}

// Использование
var mediator = ServiceProvider.GetService<IMediator>();
var userId = await mediator.Send(new CreateUserCommand("Alice"));
```

ASP.NET Core SignalR
Библиотека для реального времени
Как используется:
Hub выступает посредником между клиентами (браузер, мобильное приложение).
Клиенты не общаются напрямую, только через хаб.

```csharp
public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        // Посредник (хаб) пересылает сообщение всем клиентам
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}
```

MassTransit (Message Broker)
Библиотека для обмена сообщениями
Посредник между сервисами через брокеры (RabbitMQ, Azure Service Bus).
Обработка сообщений через IConsumer<T>.

```csharp
public class OrderConsumer : IConsumer<SubmitOrder>
{
    public async Task Consume(ConsumeContext<SubmitOrder> context)
    {
        // Логика обработки заказа
    }
}
```

