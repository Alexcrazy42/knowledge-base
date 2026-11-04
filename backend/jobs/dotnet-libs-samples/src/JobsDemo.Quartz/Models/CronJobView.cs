namespace JobsDemo.Quartz.Models;

/// <summary>
/// Представление cron-подписки для UI. Оно собирается из job detail и trigger,
/// которые Quartz хранит в Postgres.
/// </summary>
public sealed record CronJobView(
    string Id,
    string To,
    string Subject,
    string Body,
    string CronExpression,
    string TriggerState,
    DateTimeOffset? NextFireTimeUtc);
