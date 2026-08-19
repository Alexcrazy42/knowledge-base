using Api.Dtos;
using Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SseController : ControllerBase
{
    private readonly QueueManager _queueManager;
    private readonly ILogger<SseController> _logger;
    
    public SseController(QueueManager queueManager, ILogger<SseController> logger)
    {
        _queueManager = queueManager;
        _logger = logger;
    }
    
    [HttpPost("send")]
    public IActionResult Send([FromBody] MessageDto message)
    {
        message.Source = "SSE";
        message.Timestamp = DateTime.UtcNow;
        
        // Отправляем ТОЛЬКО в очередь SSE
        _queueManager.SendToQueue("sse", message);
        
        return Ok(new { success = true, message = "Message sent to SSE queue" });
    }
    
    [HttpGet("stream")]
    public async Task Stream(CancellationToken cancellationToken)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        
        _logger.LogInformation("SSE client connected");
        
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                var message = await _queueManager.SseQueue.DequeueAsync(cancellationToken);
                if (message != null)
                {
                    var json = System.Text.Json.JsonSerializer.Serialize(message);
                    await Response.WriteAsync($"data: {json}\n", cancellationToken: cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                    
                    _logger.LogDebug("SSE sent: {Text}", message.Text);
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("SSE client disconnected");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSE stream error");
        }
    }
}