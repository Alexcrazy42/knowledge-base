using JobsDemo.Quartz.Jobs;
using JobsDemo.Quartz.Models;
using JobsDemo.Shared.Contracts;
using JobsDemo.Shared.Persistence;
using JobsDemo.Shared.Services;
using Npgsql;
using Quartz;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Quartz")
    ?? throw new InvalidOperationException("ConnectionStrings:Quartz is required.");

builder.Services.AddSingleton(_ => NpgsqlDataSource.Create(connectionString));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<ActivityStore>();
builder.Services.AddSingleton<IEmailGateway, InMemoryEmailGateway>();

builder.AddQuartz((configure) =>
{
    configure.ConfigureScheduler(options =>
    {
        options.InstanceName = "application1";
    });

    configure.UsePersistentStore(store =>
    {
        // Postgres — единственный источник расписания. ProvisionSchema создаёт
        // таблицы QRTZ_* при первом запуске, поэтому init-скрипт их не создаёт.
        store.UsePostgres(connectionString);
        store.UseExecutionHistory();
        store.ProvisionSchema();
        store.ConfigureStore(options =>
        {
            options.TablePrefix = "qrtz_";

            // Строки в job data map удобнее для диагностики через SQL и dashboard.
            options.StoreJobDataAsStrings = true;
        });
    });

    // Recurring: heartbeat каждые 30 секунд. Имена заданы явно — иначе
    // persistent store будет накапливать копии при каждом старте.
    configure.AddJob<HeartbeatJob>(job => job
        .WithIdentity("heartbeat", "maintenance")
        .WithDescription("Writes an activity row every 30 seconds."));

    configure.AddTrigger<HeartbeatJob>(trigger => trigger
        .WithIdentity("heartbeat-trigger", "maintenance")
        .ForJob("heartbeat", "maintenance")
        .WithDescription("Every 30 seconds.")
        .WithCronSchedule("0/30 * * * * ?"));

    // Recurring. Он виден в dashboard и в нашем UI.
    configure.AddJob<SendEmailJob>(job => job
        .WithIdentity("hourly-digest", "emails")
        .WithDescription("Sends the hourly operations digest.")
        .UsingJobData("scenario", "recurring-digest")
        .UsingJobData("to", "ops@example.com")
        .UsingJobData("subject", "Hourly digest")
        .UsingJobData("body", "Recurring job: the hourly digest was produced by Quartz."));

    configure.AddTrigger<SendEmailJob>(trigger => trigger
        .WithIdentity("hourly-digest-trigger", "emails")
        .ForJob("hourly-digest", "emails")
        .WithDescription("Cron: every hour at minute 0.")
        .WithCronSchedule("0 0 * * * ?"));
});

builder.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);

// HTTP API и встроенный dashboard Quartz 4. Оба полностью мутирующие,
// поэтому для локального демо явно разрешаем анонимный доступ.
builder.Services.AddQuartzHttpApi();
builder.Services.AddQuartzDashboard();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<ActivityStore>().InitializeAsync();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAntiforgery();
app.MapStaticAssets();

app.MapQuartzHttpApi("/quartz-api").AllowAnonymous();
app.MapQuartzDashboard("/quartz").AllowAnonymous();

var quartzApi = app.MapGroup("/api/quartz");

quartzApi.MapGet("/summary", async (
    IScheduler scheduler,
    ActivityStore activityStore,
    IEmailGateway emailGateway,
    CancellationToken cancellationToken) =>
{
    var jobs = await scheduler.QueryJobs(
        new JobQuery { Take = PagedQuery.All },
        cancellationToken);

    var triggers = await scheduler.QueryTriggers(
        new TriggerQuery { Take = PagedQuery.All },
        cancellationToken);

    var cronJobs = await ReadCronJobsAsync(scheduler, cancellationToken);
    var activity = await activityStore.GetRecentAsync(25, cancellationToken);

    return Results.Ok(new
    {
        scheduler = new
        {
            name = scheduler.SchedulerName,
            instanceId = scheduler.SchedulerInstanceId,
            status = scheduler.Status.ToString(),
            jobCount = jobs.Items.Count,
            triggerCount = triggers.Items.Count
        },
        triggers = triggers.Items.Select(trigger => new
        {
            name = trigger.Key.Name,
            group = trigger.Key.Group,
            jobName = trigger.JobKey.Name,
            jobGroup = trigger.JobKey.Group,
            state = trigger.State.ToString(),
            type = trigger.TriggerType,
            nextFireTimeUtc = trigger.NextFireTimeUtc,
            previousFireTimeUtc = trigger.PreviousFireTimeUtc
        }),
        cronJobs,
        activity,
        emails = emailGateway.Recent(15)
    });
});

quartzApi.MapPost("/one-off", async (
    DelayedEmailRequest request,
    IScheduler scheduler,
    CancellationToken cancellationToken) =>
{
    var validation = Validate(request.To, request.Subject, request.Body);
    if (validation is not null)
    {
        return validation;
    }

    var id = Guid.NewGuid().ToString("N")[..8];
    var jobKey = new JobKey($"one-off-{id}", "one-off");
    var triggerKey = new TriggerKey($"one-off-{id}", "one-off");
    var startAt = DateTimeOffset.UtcNow.AddSeconds(Math.Clamp(request.DelaySeconds, 1, 600));

    var job = JobBuilder.Create<SendEmailJob>()
        .WithIdentity(jobKey)
        .WithDescription($"One-off email to {request.To}")
        .UsingJobData("scenario", "one-off")
        .UsingJobData("to", request.To)
        .UsingJobData("subject", request.Subject)
        .UsingJobData("body", request.Body)
        .Build();

    var trigger = TriggerBuilder.Create()
        .WithIdentity(triggerKey)
        .ForJob(jobKey)
        .StartAt(startAt)
        .WithDescription($"Fires once at {startAt:O}")
        .Build();

    await scheduler.ScheduleJob(job, trigger, cancellationToken: cancellationToken);

    return Results.Ok(new
    {
        id,
        nextFireTimeUtc = startAt,
        message = $"Simple trigger scheduled for {startAt:O}."
    });
});

quartzApi.MapPost("/cron", async (
    CronEmailRequest request,
    IScheduler scheduler,
    CancellationToken cancellationToken) =>
{
    var validation = Validate(request.To, request.Subject, request.Body);
    if (validation is not null)
    {
        return validation;
    }

    try
    {
        // Проверяем выражение до записи в job store: ошибка cron должна
        // вернуться клиенту как 400, а не упасть внутри планировщика.
        _ = new CronExpression(request.CronExpression);
    }
    catch (Exception exception) when (exception is FormatException or ArgumentException)
    {
        return Results.BadRequest(new { error = exception.Message });
    }

    var id = Guid.NewGuid().ToString("N")[..8];
    var jobKey = new JobKey($"cron-{id}", "cron-emails");
    var triggerKey = new TriggerKey($"cron-trigger-{id}", "cron-emails");

    var job = JobBuilder.Create<SendEmailJob>()
        .WithIdentity(jobKey)
        .WithDescription($"Cron email to {request.To}")
        .UsingJobData("scenario", "cron")
        .UsingJobData("to", request.To)
        .UsingJobData("subject", request.Subject)
        .UsingJobData("body", request.Body)
        .UsingJobData("cron", request.CronExpression)
        .StoreDurably()
        .Build();

    var trigger = TriggerBuilder.Create()
        .WithIdentity(triggerKey)
        .ForJob(jobKey)
        .WithCronSchedule(request.CronExpression)
        .StartNow()
        .WithDescription($"Cron: {request.CronExpression}")
        .Build();

    await scheduler.ScheduleJob(job, trigger, cancellationToken: cancellationToken);

    return Results.Ok(new { id, message = "Cron subscription created." });
});

quartzApi.MapPost("/cron/{id}/trigger", async (
    string id,
    IScheduler scheduler,
    CancellationToken cancellationToken) =>
{
    var jobKey = new JobKey($"cron-{id}", "cron-emails");
    if (!await scheduler.Exists(jobKey, cancellationToken))
    {
        return Results.NotFound(new { error = "Cron subscription not found." });
    }

    await scheduler.TriggerJob(jobKey, cancellationToken: cancellationToken);
    return Results.Ok(new { message = "Cron job triggered immediately." });
});

quartzApi.MapPost("/cron/{id}/pause", async (
    string id,
    IScheduler scheduler,
    CancellationToken cancellationToken) =>
{
    var triggerKey = new TriggerKey($"cron-trigger-{id}", "cron-emails");

    if (!await scheduler.Exists(triggerKey, cancellationToken))
    {
        return Results.NotFound(new { error = "Cron subscription not found." });
    }

    await scheduler.PauseTrigger(triggerKey, cancellationToken);
    return Results.Ok(new { message = "Cron subscription paused." });
});

quartzApi.MapPost("/cron/{id}/resume", async (
    string id,
    IScheduler scheduler,
    CancellationToken cancellationToken) =>
{
    var triggerKey = new TriggerKey($"cron-trigger-{id}", "cron-emails");
    if (!await scheduler.Exists(triggerKey, cancellationToken))
    {
        return Results.NotFound(new { error = "Cron subscription not found." });
    }

    await scheduler.ResumeTrigger(triggerKey, cancellationToken);
    return Results.Ok(new { message = "Cron subscription resumed." });
});

quartzApi.MapDelete("/cron/{id}", async (
    string id,
    IScheduler scheduler,
    CancellationToken cancellationToken) =>
{
    var jobKey = new JobKey($"cron-{id}", "cron-emails");
    if (!await scheduler.DeleteJob(jobKey, cancellationToken))
    {
        return Results.NotFound(new { error = "Cron subscription not found." });
    }

    return Results.Ok(new { message = "Cron subscription deleted." });
});

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.Run();

static async Task<IReadOnlyList<CronJobView>> ReadCronJobsAsync(
    IScheduler scheduler,
    CancellationToken cancellationToken)
{
    var triggers = await scheduler.QueryTriggers(
        new TriggerQuery
        {
            Group = GroupMatcher<TriggerKey>.GroupEquals("cron-emails"),
            Take = PagedQuery.All
        },
        cancellationToken);

    var result = new List<CronJobView>();

    foreach (var trigger in triggers.Items)
    {
        var job = await scheduler.GetJobDetail(trigger.JobKey, cancellationToken);
        if (job is null)
        {
            continue;
        }

        var id = trigger.Key.Name.StartsWith("cron-trigger-", StringComparison.Ordinal)
            ? trigger.Key.Name["cron-trigger-".Length..]
            : trigger.Key.Name;

        result.Add(new CronJobView(
            id,
            job.JobDataMap.GetString("to") ?? "ops@example.com",
            job.JobDataMap.GetString("subject") ?? "Cron notification",
            job.JobDataMap.GetString("body") ?? "",
            job.JobDataMap.GetString("cron") ?? "",
            trigger.State.ToString(),
            trigger.NextFireTimeUtc));
    }

    return result;
}

static IResult? Validate(string to, string subject, string body)
{
    if (string.IsNullOrWhiteSpace(to) ||
        string.IsNullOrWhiteSpace(subject) ||
        string.IsNullOrWhiteSpace(body))
    {
        return Results.BadRequest(new { error = "Recipient, subject and body are required." });
    }

    return null;
}
