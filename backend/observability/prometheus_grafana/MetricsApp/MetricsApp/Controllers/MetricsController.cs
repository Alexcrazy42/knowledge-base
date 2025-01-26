using Microsoft.AspNetCore.Mvc;
using Prometheus;
using System.Diagnostics;

[ApiController]
[Route("[controller]")]
public class TestController : ControllerBase
{
    // Метрики
    private static readonly Counter RequestCount = Metrics
        .CreateCounter("myapp_request_count", "Number of requests received.");

    private static readonly Counter ErrorCount = Metrics
        .CreateCounter("myapp_error_count", "Number of requests that resulted in an error.");

    private static readonly Histogram RequestDuration = Metrics
        .CreateHistogram("myapp_request_duration_seconds", "Duration of requests in seconds.");

    private static readonly Gauge ActiveRequests = Metrics
        .CreateGauge("myapp_active_requests", "Number of active requests.");

    private static readonly Histogram RequestSize = Metrics
        .CreateHistogram("myapp_request_size_bytes", "Size of requests in bytes.");

    [HttpGet]
    public IActionResult Get()
    {
        // Увеличиваем счетчик активных запросов
        ActiveRequests.Inc();

        // Фиксируем время начала обработки запроса
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Логика обработки запроса
            RequestCount.Inc();

            // Пример: измерение размера запроса (если это POST/PUT запрос)
            if (Request.ContentLength.HasValue)
            {
                RequestSize.Observe(Request.ContentLength.Value);
            }

            // Имитация обработки запроса
            Thread.Sleep(new Random().Next(50, 200)); // Задержка для имитации работы

            return Ok("Hello, Prometheus!");
        }
        catch (Exception ex)
        {
            // Увеличиваем счетчик ошибок
            ErrorCount.Inc();

            // Логируем ошибку (опционально)
            Console.WriteLine($"Error: {ex.Message}");

            return StatusCode(500, "Internal Server Error");
        }
        finally
        {
            // Фиксируем время окончания обработки запроса
            stopwatch.Stop();

            // Записываем длительность запроса в гистограмму
            RequestDuration.Observe(stopwatch.Elapsed.TotalSeconds);

            // Уменьшаем счетчик активных запросов
            ActiveRequests.Dec();
        }
    }

    [HttpPost]
    public IActionResult Post([FromBody] string data)
    {
        // Увеличиваем счетчик активных запросов
        ActiveRequests.Inc();

        // Фиксируем время начала обработки запроса
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Логика обработки запроса
            RequestCount.Inc();

            // Измерение размера запроса
            if (Request.ContentLength.HasValue)
            {
                RequestSize.Observe(Request.ContentLength.Value);
            }

            // Имитация обработки запроса
            Thread.Sleep(new Random().Next(50, 200)); // Задержка для имитации работы

            return Ok($"Received: {data}");
        }
        catch (Exception ex)
        {
            // Увеличиваем счетчик ошибок
            ErrorCount.Inc();

            // Логируем ошибку (опционально)
            Console.WriteLine($"Error: {ex.Message}");

            return StatusCode(500, "Internal Server Error");
        }
        finally
        {
            // Фиксируем время окончания обработки запроса
            stopwatch.Stop();

            // Записываем длительность запроса в гистограмму
            RequestDuration.Observe(stopwatch.Elapsed.TotalSeconds);

            // Уменьшаем счетчик активных запросов
            ActiveRequests.Dec();
        }
    }
}