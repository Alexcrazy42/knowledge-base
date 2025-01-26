using Prometheus;

namespace MetricsApp;

public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddControllers();

        services.AddControllers();
        services.AddHttpContextAccessor();
        services.AddSingleton<IMetricServer, KestrelMetricServer>();
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }

        app.UseRouting();

        app.UseAuthorization();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
            endpoints.MapMetrics(); // Добавляем маршрут для метрик
        });
    }
}