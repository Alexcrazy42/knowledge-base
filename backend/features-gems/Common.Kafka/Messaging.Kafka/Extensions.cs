using Messaging.Kafka.Consumer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Messaging.Kafka;

public static class Extensions
{
    public static void ConfigureKafka(this IServiceCollection services, IConfigurationSection section)
    {
        services.Configure<KafkaSettings>(section);
    }
    
    public static void AddProducer<TMessage>(this IServiceCollection services,
        string topicName)
    {
        services.AddSingleton<IKafkaProducer<TMessage>>(provider =>
        {
            var kafkaSettings = provider.GetRequiredService<IOptions<KafkaSettings>>();
            return new KafkaProducer<TMessage>(kafkaSettings, topicName);
        });
    }

    public static void AddConsumer<TMessage, THandler>(this IServiceCollection services,
        string topicName,
        string groupId)
        where THandler : class, IMessageHandler<TMessage>
    {
        services.AddSingleton<IMessageHandler<TMessage>, THandler>();
        
        services.AddHostedService<KafkaConsumer<TMessage>>(provider =>
        {
            var kafkaSettings = provider.GetRequiredService<IOptions<KafkaSettings>>();
            var handler = provider.GetRequiredService<IMessageHandler<TMessage>>();
            return new KafkaConsumer<TMessage>(kafkaSettings, handler, topicName, groupId);
        });
    }
    
}