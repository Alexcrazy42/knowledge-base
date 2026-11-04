using JobsDemo.Shared.Contracts;

namespace JobsDemo.Shared.Services;

/// <summary>
/// Абстракция над отправкой писем. В демо реализация не ходит в SMTP,
/// но задания вызывают её так же, как вызывали бы настоящий сервис.
/// </summary>
public interface IEmailGateway
{
    ValueTask SendAsync(SendEmailRequest request, string source, CancellationToken cancellationToken = default);

    IReadOnlyList<SentEmail> Recent(int count = 20);
}
