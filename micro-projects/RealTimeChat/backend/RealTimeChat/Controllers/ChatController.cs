using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RealTimeChat.Data;
using RealTimeChat.Models;

namespace RealTimeChat.Controllers;

[ApiController]
[Route("api/[controller]s")]
public class ChatController : ControllerBase
{
    private readonly ChatDbContext _chatDbContext;

    public ChatController(ChatDbContext chatDbContext)
    {
        _chatDbContext = chatDbContext;
    }

    [HttpGet("/{chatRoom}")]
    public async Task<IReadOnlyCollection<Message>> GetMessagesAsync(string chatRoom, CancellationToken ct)
    {
        var messages = await _chatDbContext.Messages
            .Where(x => x.ChatRoom == chatRoom)
            .OrderBy(x => x.SendedAt)
            .ToListAsync(ct);
        
        return messages;
    }
}