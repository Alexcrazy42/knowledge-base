using MassTransit;

namespace MassTransitExample;

public class MessageConsumer : IConsumer<Message>
{
    private readonly ILogger<MessageConsumer> _logger;

    public MessageConsumer(ILogger<MessageConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<Message> context)
    {
        var message = context.Message;  // Теперь message имеет тип Message
        _logger.LogInformation($"Message received: {message.Text}");
        await Task.CompletedTask;
    }
}
