using Hangfire;
using Hangfire.PostgreSql;
using Hangfire.Storage;
using JobsDemo.Hangfire.Jobs;
using JobsDemo.Shared.Contracts;
using JobsDemo.Shared.Persistence;
using JobsDemo.Shared.Services;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Hangfire")
    ?? throw new InvalidOperationException("ConnectionStrings:Hangfire is required.");

// Один NpgsqlDataSource на приложение: пул соединений создаётся один раз.
builder.Services.AddSingleton(_ => NpgsqlDataSource.Create(connectionString));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<ActivityStore>();
builder.Services.AddSingleton<IEmailGateway, InMemoryEmailGateway>();
builder.Services.AddScoped<EmailJobs>();

builder.Services.AddHangfire(configuration => configuration
    // Версия 1.8 понимает и старые, и новые форматы хранения.
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(
        options => options.UseNpgsqlConnection(connectionString),
        new PostgreSqlStorageOptions
        {
            // Отдельная схема не конфликтует с таблицами демо-журнала.
            SchemaName = "hangfire",
            PrepareSchemaIfNecessary = true
        }));

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = Math.Max(2, Environment.ProcessorCount);
    options.Queues = ["default", "emails"];
});

// Регистрируем зависимости явно: так демо не зависит от того, какие
// сервисы Hangfire добавил в контейнер в текущей версии.
builder.Services.TryAddSingleton<IMonitoringApi>(_ => JobStorage.Current.GetMonitoringApi());
builder.Services.TryAddSingleton<IRecurringJobManager>(_ => new RecurringJobManager());

var app = builder.Build();

// Журнал создаётся при старте: UI должен уметь читать его сразу.
using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<ActivityStore>().InitializeAsync();
}

// Recurring job объявляется идемпотентно: при рестарте Hangfire обновит
// расписание, а не создаст второй экземпляр.
using (var scope = app.Services.CreateScope())
{
    var recurringJobs = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobs.AddOrUpdate<EmailJobs>(
        "hourly-digest",
        job => job.SendHourlyDigest("ops@example.com", "Hourly digest"),
        "0 * * * *",
        new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });


    recurringJobs.AddOrUpdate<EmailJobs>(
        "hourly-digest3",
        job => job.SendHourlyDigest("ops1@example.com", "Hourly digest1"),
        "0 * * * *",
        new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
}

app.UseDefaultFiles();
app.UseStaticFiles();

// Встроенный dashboard Hangfire. Для локального демо оставляем стандартную
// авторизацию Hangfire: доступ только с localhost.
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    AppPath = "/",
    DashboardTitle = "Hangfire Playground",
    DarkModeEnabled = true
});

var hangfireApi = app.MapGroup("/api/hangfire");

hangfireApi.MapGet("/summary", async (
    IMonitoringApi monitoring,
    ActivityStore activityStore,
    IEmailGateway emailGateway,
    CancellationToken cancellationToken) =>
{
    var stats = monitoring.GetStatistics();

    // GetRecurringJobs читает расписания из job store, а не из памяти.
    using var connection = JobStorage.Current.GetConnection();
    var recurringJobs = connection.GetRecurringJobs()
        .Select(job => new
        {
            id = job.Id,
            cron = job.Cron,
            nextExecution = job.NextExecution,
            lastExecution = job.LastExecution,
            lastJobState = job.LastJobState
        })
        .ToArray();

    var activity = await activityStore.GetRecentAsync(25, cancellationToken);

    return Results.Ok(new
    {
        stats = new
        {
            enqueued = stats.Enqueued,
            processing = stats.Processing,
            scheduled = stats.Scheduled,
            succeeded = stats.Succeeded,
            failed = stats.Failed,
            servers = stats.Servers
        },
        recurringJobs,
        activity,
        emails = emailGateway.Recent(15)
    });
});

hangfireApi.MapPost("/fire-and-forget", (
    SendEmailRequest request,
    IBackgroundJobClient backgroundJobs) =>
{
    var validation = Validate(request);
    if (validation is not null)
    {
        return validation;
    }

    var jobId = backgroundJobs.Enqueue<EmailJobs>(job => job.SendWelcomeEmail(request));
    return Results.Ok(new { jobId, message = "Job enqueued." });
});

hangfireApi.MapPost("/delayed", (
    DelayedEmailRequest request,
    IBackgroundJobClient backgroundJobs) =>
{
    var validation = Validate(new SendEmailRequest(request.To, request.Subject, request.Body));
    if (validation is not null)
    {
        return validation;
    }

    var delay = TimeSpan.FromSeconds(Math.Clamp(request.DelaySeconds, 1, 600));
    var email = new SendEmailRequest(request.To, request.Subject, request.Body);
    var jobId = backgroundJobs.Schedule<EmailJobs>(
        job => job.SendReminderEmail(email),
        delay);

    return Results.Ok(new
    {
        jobId,
        message = $"Job scheduled in {delay.TotalSeconds:0} seconds."
    });
});

hangfireApi.MapPost("/recurring/{id}/trigger", (string id, IRecurringJobManager recurringJobs) =>
{
    recurringJobs.Trigger(id);
    return Results.Ok(new { message = $"Recurring job '{id}' was triggered." });
});

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.Run();

static IResult? Validate(SendEmailRequest request)
{
    if (string.IsNullOrWhiteSpace(request.To) ||
        string.IsNullOrWhiteSpace(request.Subject) ||
        string.IsNullOrWhiteSpace(request.Body))
    {
        return Results.BadRequest(new { error = "Recipient, subject and body are required." });
    }

    return null;
}
