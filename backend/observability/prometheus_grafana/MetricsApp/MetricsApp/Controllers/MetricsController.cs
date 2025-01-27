using Microsoft.AspNetCore.Mvc;
using Prometheus;
using System.Diagnostics;
using System.Threading.Tasks;

[ApiController]
[Route("[controller]")]
public class TestController : ControllerBase
{
    private static readonly Counter RequestCount = Metrics
        .CreateCounter("myapp_request_count", "Number of requests received.", new CounterConfiguration
        {
            LabelNames = new[] { "method", "endpoint" }
        });

    private static readonly Counter ErrorCount = Metrics
        .CreateCounter("myapp_error_count", "Number of requests that resulted in an error.", new CounterConfiguration
        {
            LabelNames = new[] { "method", "endpoint" }
        });

    private static readonly Histogram RequestDuration = Metrics
        .CreateHistogram("myapp_request_duration_seconds", "Duration of requests in seconds.", new HistogramConfiguration
        {
            LabelNames = new[] { "method", "endpoint" }
        });

    private static readonly Gauge ActiveRequests = Metrics
        .CreateGauge("myapp_active_requests", "Number of active requests.", new GaugeConfiguration
        {
            LabelNames = new[] { "method", "endpoint" }
        });

    private static readonly Histogram RequestSize = Metrics
        .CreateHistogram("myapp_request_size_bytes", "Size of requests in bytes.", new HistogramConfiguration
        {
            LabelNames = new[] { "method", "endpoint" }
        });

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var method = "GET";
        var endpoint = "Get";

        ActiveRequests.WithLabels(method, endpoint).Inc();

        var stopwatch = Stopwatch.StartNew();

        try
        {
            RequestCount.WithLabels(method, endpoint).Inc();

            if (Request.ContentLength.HasValue)
            {
                RequestSize.WithLabels(method, endpoint).Observe(Request.ContentLength.Value);
            }

            await Task.Delay(new Random().Next(50, 200));

            return Ok("Hello, Prometheus!");
        }
        catch (Exception ex)
        {
            ErrorCount.WithLabels(method, endpoint).Inc();

            return StatusCode(500, "Internal Server Error");
        }
        finally
        {
            stopwatch.Stop();

            RequestDuration.WithLabels(method, endpoint).Observe(stopwatch.Elapsed.TotalSeconds);

            ActiveRequests.WithLabels(method, endpoint).Dec();
        }
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] string data)
    {
        var method = "POST";
        var endpoint = "Post";

        ActiveRequests.WithLabels(method, endpoint).Inc();

        var stopwatch = Stopwatch.StartNew();

        try
        {
            RequestCount.WithLabels(method, endpoint).Inc();

            if (Request.ContentLength.HasValue)
            {
                RequestSize.WithLabels(method, endpoint).Observe(Request.ContentLength.Value);
            }

            await Task.Delay(new Random().Next(50, 200)); // Асинхронная задержка

            return Ok($"Received: {data}");
        }
        catch (Exception ex)
        {
            ErrorCount.WithLabels(method, endpoint).Inc();

            Console.WriteLine($"Error: {ex.Message}");

            return StatusCode(500, "Internal Server Error");
        }
        finally
        {
            stopwatch.Stop();

            RequestDuration.WithLabels(method, endpoint).Observe(stopwatch.Elapsed.TotalSeconds);

            ActiveRequests.WithLabels(method, endpoint).Dec();
        }
    }
}
