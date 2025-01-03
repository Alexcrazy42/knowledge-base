using Messaging.Kafka;
using Messaging.Kafka.Consumer;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.ConfigureKafka(builder.Configuration.GetSection("Kafka"));
builder.Services.AddProducer<Order>(builder.Configuration["KafkaMetadata:Topics:OrderCreated"]!);

builder.Services.AddConsumer<Order, OrderCreatedHandler>(builder.Configuration["KafkaMetadata:Topics:OrderCreated"]!,
    builder.Configuration["KafkaMetadata:Groups:Group1"]!);

builder.Services.AddProducer<OrderUpdated>(builder.Configuration["KafkaMetadata:Topics:OrderUpdated"]!);
builder.Services.AddConsumer<OrderUpdated, OrderUpdatedHandler>(builder.Configuration["KafkaMetadata:Topics:OrderUpdated"]!,
    builder.Configuration["KafkaMetadata:Groups:Group1"]!);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapPost("/create-order", async (IKafkaProducer<Order> producer, CancellationToken ct) =>
{
    await producer.ProduceAsync(new Order
    {
        Id = Guid.NewGuid(),
        Name = "new order"
    }, ct);
});

app.MapPost("/update-order", async (IKafkaProducer<OrderUpdated> producer, CancellationToken ct) =>
{
    await producer.ProduceAsync(new OrderUpdated
    {
        Id = Guid.NewGuid(),
        Name = "update order"
    }, ct);
});

app.Run();

public class OrderCreatedHandler(ILogger<OrderCreatedHandler> logger) : IMessageHandler<Order>
{
    public Task HandleAsync(Order message, CancellationToken cancellationToken)
    {
        logger.LogInformation($"Заказ создан. Начинаем обработку {message.Id} {message.Name}");
        return Task.CompletedTask;
    }
}

public class OrderUpdatedHandler(ILogger<OrderUpdatedHandler> logger) : IMessageHandler<OrderUpdated>
{
    public Task HandleAsync(OrderUpdated message, CancellationToken cancellationToken)
    {
        logger.LogInformation($"Заказ обновлен. Начинаем обработку {message.Id} {message.Name}");
        return Task.CompletedTask;
    }
}

public class Order
{
    public Guid Id { get; set; }
    
    public string Name { get; set; }
}

public class OrderUpdated
{
    public Guid Id { get; set; }
    
    public string Name { get; set; }
}