using Prometheus;

var builder = WebApplication.CreateBuilder(args);

// Добавление сервисов
builder.Services.AddControllers();

var app = builder.Build();

// Настройка middleware для сбора метрик
app.UseRouting();
app.UseHttpMetrics(); // Сбор метрик HTTP запросов

app.MapControllers();
app.MapMetrics(); // Экспорт метрик на endpoint /metrics

app.Run();