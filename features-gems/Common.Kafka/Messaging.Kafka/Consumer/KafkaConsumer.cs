using Confluent.Kafka;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Messaging.Kafka.Consumer;

public class KafkaConsumer<TMessage> : BackgroundService
{
    private readonly string _topic;
    private readonly string _groupId;
    private readonly IConsumer<string, TMessage> _consumer;
    private readonly IMessageHandler<TMessage> _handler;
    
    public KafkaConsumer(IOptions<KafkaSettings> kafkaSettings,
        IMessageHandler<TMessage> handler,
        string topic,
        string groupId)
    {
        var config = new ConsumerConfig()
        {
            BootstrapServers = kafkaSettings.Value.BootstrapServers,
            GroupId = groupId
        };

        _topic = topic;
        _groupId = groupId;
        _handler = handler;
        
        _consumer = new ConsumerBuilder<string, TMessage>(config)
            .SetValueDeserializer(new KafkaValueDeserializer<TMessage>())
            .Build();
    }
    
    
    
    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        return Task.Run(() =>
        {
            ConsumeAsync(stoppingToken);
        }, stoppingToken);
    }

    private async Task? ConsumeAsync(CancellationToken stoppingToken)
    {
        _consumer.Subscribe(_topic);
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                var result = _consumer.Consume(stoppingToken);
                await _handler.HandleAsync(result.Message.Value, stoppingToken);
            }
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            throw;
        }
    }
}