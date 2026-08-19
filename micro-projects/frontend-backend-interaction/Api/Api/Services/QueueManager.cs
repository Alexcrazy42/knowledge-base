using Api.Dtos;

namespace Api.Services;

public class QueueManager
{
    // Каждый протокол получает свою очередь
    public MessageQueue PollingQueue { get; } = new();
    public MessageQueue LongPollingQueue { get; } = new();
    public MessageQueue SseQueue { get; } = new();
    public MessageQueue WebSocketQueue { get; } = new();
    
    // Универсальный метод отправки
    public void SendToAll(MessageDto message)
    {
        PollingQueue.Enqueue(message);
        LongPollingQueue.Enqueue(message);
        SseQueue.Enqueue(message);
        WebSocketQueue.Enqueue(message);
    }
    
    // Отправка в конкретную очередь
    public void SendToQueue(string protocol, MessageDto message)
    {
        var queue = protocol.ToLower() switch
        {
            "polling" => PollingQueue,
            "longpolling" => LongPollingQueue,
            "sse" => SseQueue,
            "websocket" => WebSocketQueue,
            _ => throw new ArgumentException($"Unknown protocol: {protocol}")
        };
        
        queue.Enqueue(message);
    }
}