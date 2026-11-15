using JobsDemo.Shared.Contracts;
using JobsDemo.Shared.Persistence;
using JobsDemo.Shared.Services;
using Quartz;

namespace JobsDemo.Quartz.Jobs;

/// <summary>
/// Одно задание используется и для простого триггера, и для cron-подписок.
/// Параметры передаются через job data map: так они сохраняются в Postgres
/// вместе с job detail и переживают перезапуск планировщика.
/// </summary>
public sealed class SendEmailJob(
    IEmailGateway emailGateway,
    ActivityStore activityStore,
    ILogger<SendEmailJob> logger) : IJob
{
    public async ValueTask Execute(IJobExecutionContext context, CancellationToken cancellationToken = default)
    {
        var data = context.MergedJobDataMap;
        var scenario = data.GetString("scenario") ?? "quartz";
        var request = new SendEmailRequest(
            data.GetString("to") ?? "ops@example.com",
            data.GetString("subject") ?? "Quartz notification",
            data.GetString("body") ?? "Message sent by a Quartz job.");

        await emailGateway.SendAsync(request, $"quartz/{scenario}", cancellationToken);
        await activityStore.RecordAsync(
            "quartz",
            scenario,
            $"Email to {request.To}: {request.Subject}",
            cancellationToken);

        logger.LogInformation(
            "Quartz job {JobKey} completed for {Recipient}",
            context.JobDetail.Key,
            request.To);
    }
}
