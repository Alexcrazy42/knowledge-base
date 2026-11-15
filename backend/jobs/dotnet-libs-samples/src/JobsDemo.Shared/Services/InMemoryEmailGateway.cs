using System.Collections.Concurrent;
using JobsDemo.Shared.Contracts;
using Microsoft.Extensions.Logging;

namespace JobsDemo.Shared.Services;

/// <summary>
/// Имитация внешнего email-провайдера. Задержка показывает, что задания
/// действительно выполняются асинхронно, а не просто пишут строку в лог.
/// </summary>
public sealed class InMemoryEmailGateway(
    ILogger<InMemoryEmailGateway> logger,
    TimeProvider timeProvider) : IEmailGateway
{
    private const int MaxRetainedMessages = 100;
    private readonly ConcurrentQueue<SentEmail> _outbox = new();

    public async ValueTask SendAsync(
        SendEmailRequest request,
        string source,
        CancellationToken cancellationToken = default)
    {
        // Небольшая случайная задержка имитирует сетевой вызов.
        await Task.Delay(Random.Shared.Next(150, 550), cancellationToken);

        var message = new SentEmail(
            Guid.NewGuid(),
            request.To,
            request.Subject,
            request.Body,
            source,
            timeProvider.GetUtcNow());

        _outbox.Enqueue(message);

        // Держим только последние сообщения: демо не должно расти бесконечно.
        while (_outbox.Count > MaxRetainedMessages)
        {
            _outbox.TryDequeue(out _);
        }

        logger.LogInformation(
            "Simulated email {EmailId} to {Recipient} from {Source}: {Subject}",
            message.Id,
            message.To,
            source,
            message.Subject);
    }

    public IReadOnlyList<SentEmail> Recent(int count = 20)
        => _outbox.Reverse().Take(Math.Clamp(count, 1, MaxRetainedMessages)).ToArray();
}
