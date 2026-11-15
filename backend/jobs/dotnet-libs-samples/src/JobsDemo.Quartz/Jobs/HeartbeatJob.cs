using JobsDemo.Shared.Persistence;
using Quartz;

namespace JobsDemo.Quartz.Jobs;

/// <summary>
/// Простейший recurring job: раз в 30 секунд пишет строку в журнал.
/// Он нужен, чтобы recurring-триггер был виден в UI сразу после запуска.
/// </summary>
public sealed class HeartbeatJob(
    ActivityStore activityStore,
    ILogger<HeartbeatJob> logger) : IJob
{
    public async ValueTask Execute(IJobExecutionContext context, CancellationToken cancellationToken = default)
    {
        await activityStore.RecordAsync(
            "quartz",
            "heartbeat",
            $"Scheduler heartbeat from {context.Scheduler.SchedulerName}.",
            cancellationToken);

        logger.LogInformation(
            "Quartz heartbeat fired on {SchedulerName}",
            context.Scheduler.SchedulerName);
    }
}
