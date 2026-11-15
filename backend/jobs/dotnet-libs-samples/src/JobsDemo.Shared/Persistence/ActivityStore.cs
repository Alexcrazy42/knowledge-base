using JobsDemo.Shared.Contracts;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace JobsDemo.Shared.Persistence;

/// <summary>
/// Небольшой журнал выполнения заданий. Он не является частью job store:
/// и Hangfire, и Quartz хранят свои задания сами. Журнал нужен, чтобы UI
/// показывал понятный результат и чтобы результат переживал перезапуск.
/// </summary>
public sealed class ActivityStore(
    NpgsqlDataSource dataSource,
    ILogger<ActivityStore> logger)
{
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS demo_activity (
                id         bigserial PRIMARY KEY,
                source     text        NOT NULL,
                job_name   text        NOT NULL,
                detail     text        NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now()
            );

            CREATE INDEX IF NOT EXISTS ix_demo_activity_created_at
                ON demo_activity (created_at DESC);
            """;

        await using var command = dataSource.CreateCommand(sql);
        await command.ExecuteNonQueryAsync(cancellationToken);

        logger.LogInformation("Activity journal is ready");
    }

    public async Task RecordAsync(
        string source,
        string jobName,
        string detail,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO demo_activity (source, job_name, detail)
            VALUES (@source, @job_name, @detail);
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("source", source);
        command.Parameters.AddWithValue("job_name", jobName);
        command.Parameters.AddWithValue("detail", detail);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ActivityEntry>> GetRecentAsync(
        int count = 25,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id, source, job_name, detail, created_at
            FROM demo_activity
            ORDER BY created_at DESC, id DESC
            LIMIT @count;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("count", Math.Clamp(count, 1, 100));

        var entries = new List<ActivityEntry>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var createdAt = reader.GetFieldValue<DateTime>(4);
            entries.Add(new ActivityEntry(
                reader.GetInt64(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                new DateTimeOffset(DateTime.SpecifyKind(createdAt, DateTimeKind.Utc))));
        }

        return entries;
    }
}
