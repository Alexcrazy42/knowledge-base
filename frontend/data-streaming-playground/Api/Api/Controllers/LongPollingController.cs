using Api.Dtos;
using Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LongPollingController : ControllerBase
{
    private readonly QueueManager _queueManager;
    
    public LongPollingController(QueueManager queueManager)
    {
        _queueManager = queueManager;
    }
    
    [HttpPost("send")]
    public IActionResult Send([FromBody] MessageDto message)
    {
        message.Source = "LongPolling";
        message.Timestamp = DateTime.UtcNow;
        
        // Отправляем ТОЛЬКО в очередь LongPolling
        _queueManager.SendToQueue("longpolling", message);
        
        return Ok(new { success = true, message = "Message sent to LongPolling queue" });
    }
    
    [HttpGet("long-polling-receive")]
    public async Task<IActionResult> Receive(CancellationToken cancellationToken)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(30));
        
        try
        {
            // Ждем сообщение ТОЛЬКО из очереди LongPolling
            var message = await _queueManager.LongPollingQueue.DequeueAsync(cts.Token);
            if (message != null)
                return Ok(message);
            
            return NoContent();
        }
        catch (OperationCanceledException)
        {
            return NoContent();
        }
    }
}