namespace Messaging.Kafka;

public interface IKafkaProducer<in TMessage> : IDisposable
{
    string GetTopic();
    
    Task ProduceAsync(TMessage message, CancellationToken cancellationToken = default);
}