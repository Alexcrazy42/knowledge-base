using MassTransit;
using MassTransitExample;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "My API",
        Version = "v1",
        Description = "A simple API to test Swagger integration"
    });
});

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<MessageConsumer>();
    
    
    x.AddRider(rider =>
    {
        rider.AddConsumer<MessageConsumer>();

        rider.UsingKafka((context, k) =>
        {
            k.Host("localhost:9092");

            k.TopicEndpoint<Message>("topic-name", "consumer-group-name", e =>
            {
                e.ConfigureConsumer<MessageConsumer>(context);
            });
        });
    });
});

builder.Services.AddMassTransitHostedService();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwaggerUI();
    app.UseSwagger();
}

app.UseRouting();

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
});

app.Run();