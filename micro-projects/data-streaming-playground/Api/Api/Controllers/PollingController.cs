using Api.Dtos;
using Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PollingController : ControllerBase
{
    private readonly QueueManager _queueManager;
    
    public PollingController(QueueManager queueManager)
    {
        _queueManager = queueManager;
    }
    
    [HttpPost("send")]
    public IActionResult Send([FromBody] MessageDto message)
    {
        message.Source = "Polling";
        message.Timestamp = DateTime.UtcNow;
        
        // Отправляем ТОЛЬКО в очередь Polling
        _queueManager.SendToQueue("polling", message);
        
        return Ok(new { success = true, message = "Message sent to Polling queue" });
    }
    
    [HttpGet("receive")]
    public IActionResult Receive()
    {
        // Получаем сообщения ТОЛЬКО из очереди Polling
        var messages = _queueManager.PollingQueue.GetAll();
        return Ok(messages);
    }
}