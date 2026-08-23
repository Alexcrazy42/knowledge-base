using Api.Dtos;
using Api.Services;
using Microsoft.AspNetCore.SignalR;

namespace Api.Hubs;

public class ChatHub : Hub
{
    private readonly QueueManager _queueManager;
    private readonly ILogger<ChatHub> _logger;
    
    public ChatHub(QueueManager queueManager, ILogger<ChatHub> logger)
    {
        _queueManager = queueManager;
        _logger = logger;
    }
    
    public async Task SendMessage(MessageDto message)
    {
        message.Source = "WebSocket";
        message.Timestamp = DateTime.UtcNow;
        
        _logger.LogInformation("WebSocket message received: {Text}", message.Text);
        
        // Отправляем ТОЛЬКО в очередь WebSocket
        _queueManager.SendToQueue("websocket", message);
        
        // И сразу отправляем всем подключенным клиентам (для мгновенного отображения)
        await Clients.All.SendAsync("ReceiveMessage", message);
    }
    
    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("WebSocket client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }
    
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("WebSocket client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}