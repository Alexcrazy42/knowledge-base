using Confluent.Kafka;
using Microsoft.Extensions.Options;

namespace Messaging.Kafka;

public class KafkaProducer<TMessage> : IKafkaProducer<TMessage>
{
    private readonly IProducer<string, TMessage> _producer;
    private readonly string _topic;
    
    public KafkaProducer(IOptions<KafkaSettings> kafkaSettings,
        string topic)
    {
        var config = new ProducerConfig()
        {
            BootstrapServers = kafkaSettings.Value.BootstrapServers,
        };

        _producer = new ProducerBuilder<string, TMessage>(config)
            .SetValueSerializer(new KafkaJsonSerializer<TMessage>())
            .Build();

        _topic = topic;
    }
    
    public string GetTopic() => _topic;
    
    public async Task ProduceAsync(TMessage message, CancellationToken cancellationToken = default)
    {
        await _producer.ProduceAsync(_topic, new Message<string, TMessage>
        {
            Value = message
        }, cancellationToken);
    }

    public void Dispose()
    {
        // TODO release managed resources here
    }
}
