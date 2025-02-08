using MassTransit;
using Microsoft.AspNetCore.Mvc;

namespace MassTransitExample.Controllers;

[ApiController]
[Route("api/messages")]
public class MessageController : ControllerBase
{
    private readonly IBus _bus;

    public MessageController(IBus bus)
    {
        _bus = bus;
    }

    [HttpPost]
    public async Task<IActionResult> SendMessage([FromBody] string message)
    {
        await _bus.Publish(new { Text = message });
        return Ok($"Message sent: {message}");
    }
}