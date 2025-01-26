using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Distributed;
using RealTimeChat.Data;
using RealTimeChat.Models;

namespace RealTimeChat.Hubs;

public interface IChatClient
{
    public Task ReceiveMessage(string userName, string message);
}

public class ChatHub : Hub<IChatClient>
{
    private readonly IDistributedCache _cache;
    private readonly ChatDbContext _chatDbContext;

    public ChatHub(IDistributedCache cache,
        ChatDbContext chatDbContext)
    {
        _cache = cache;
        _chatDbContext = chatDbContext;
    }

    public async Task JoinChat(UserConnection connection)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, connection.ChatRoom);

        var stringConnection = JsonSerializer.Serialize(connection);

        await _cache.SetStringAsync(Context.ConnectionId, stringConnection);

        var message = new Message(
            Guid.NewGuid(),
            connection.ChatRoom,
            "",
            $"{connection.UserName} присоединился к чату",
            DateTime.UtcNow
        );

        _chatDbContext.Messages.Add(message);
        await _chatDbContext.SaveChangesAsync();

        await Clients
            .Group(connection.ChatRoom)
            .ReceiveMessage("", $"{connection.UserName} присоединился к чату");
    }

    public async Task SendMessage(string messageText)
    {
        var stringConnection = await _cache.GetAsync(Context.ConnectionId);

        var connection = JsonSerializer.Deserialize<UserConnection>(stringConnection);

        if (connection is not null)
        {
            var message = new Message(
                Guid.NewGuid(),
                connection.ChatRoom,
                connection.UserName,
                messageText,
                DateTime.UtcNow
            );
        
            _chatDbContext.Messages.Add(message);
            await _chatDbContext.SaveChangesAsync();
            
            await Clients
                .Group(connection.ChatRoom)
                .ReceiveMessage(connection.UserName, messageText);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var stringConnection = await _cache.GetAsync(Context.ConnectionId);
        var connection = JsonSerializer.Deserialize<UserConnection>(stringConnection);

        if (connection is not null)
        {
            await _cache.RemoveAsync(Context.ConnectionId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, connection.ChatRoom);

            await Clients
                .Group(connection.ChatRoom)
                .ReceiveMessage("Admin", $"{connection.UserName} покинул чат");
        }

        await base.OnDisconnectedAsync(exception);
    }
}