namespace JobsDemo.Shared.Contracts;

/// <summary>
/// Запрос на отправку письма. Записи (records) удобно сериализовать как в Hangfire
/// (Newtonsoft.Json), так и в Quartz job data map (System.Text.Json).
/// </summary>
public sealed record SendEmailRequest(string To, string Subject, string Body);

/// <summary>
/// Отложенная отправка: задержка задаётся в секундах, чтобы UI мог её менять.
/// </summary>
public sealed record DelayedEmailRequest(string To, string Subject, string Body, int DelaySeconds);

/// <summary>
/// Подписка на cron в Quartz. Cron-выражение проверяется на входе API.
/// </summary>
public sealed record CronEmailRequest(string To, string Subject, string Body, string CronExpression);

/// <summary>
/// Письмо, которое «отправил» демонстрационный шлюз. Хранится в памяти процесса,
/// чтобы UI мог показать результат работы задания без внешнего SMTP.
/// </summary>
public sealed record SentEmail(
    Guid Id,
    string To,
    string Subject,
    string Body,
    string Source,
    DateTimeOffset SentAt);

/// <summary>
/// Строка журнала выполнения задания. Журнал пишется в Postgres, поэтому
/// результаты переживают перезапуск приложения.
/// </summary>
public sealed record ActivityEntry(
    long Id,
    string Source,
    string JobName,
    string Detail,
    DateTimeOffset CreatedAt);
