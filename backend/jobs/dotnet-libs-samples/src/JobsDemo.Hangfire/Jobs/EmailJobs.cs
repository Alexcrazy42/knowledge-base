using Hangfire;
using JobsDemo.Shared.Contracts;
using JobsDemo.Shared.Persistence;
using JobsDemo.Shared.Services;

namespace JobsDemo.Hangfire.Jobs;

/// <summary>
/// Задания Hangfire. Hangfire вызывает методы по имени через сериализованное
/// выражение, поэтому методы должны быть публичными, а аргументы — сериализуемыми.
/// </summary>
public sealed class EmailJobs(
    IEmailGateway emailGateway,
    ActivityStore activityStore,
    ILogger<EmailJobs> logger)
{
    private const string Source = "hangfire";

    [Queue("emails")]
    [AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Fail)]
    public async Task SendWelcomeEmail(SendEmailRequest request)
    {
        await SendAsync("fire-and-forget", request);
    }

    [Queue("emails")]
    [AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Fail)]
    public async Task SendReminderEmail(SendEmailRequest request)
    {
        await SendAsync("delayed", request);
    }

    [Queue("emails")]
    [AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Fail)]
    [DisableConcurrentExecution(timeoutInSeconds: 30)]
    public async Task SendHourlyDigest(string to, string subject)
    {
        await SendAsync(
            "recurring",
            new SendEmailRequest(
                to,
                subject,
                "Recurring job: the hourly digest was produced by Hangfire."));
    }

    private async Task SendAsync(string jobName, SendEmailRequest request)
    {
        await emailGateway.SendAsync(request, $"{Source}/{jobName}");
        await activityStore.RecordAsync(
            Source,
            jobName,
            $"Email to {request.To}: {request.Subject}");

        logger.LogInformation(
            "Hangfire job {JobName} completed for {Recipient}",
            jobName,
            request.To);
    }
}
