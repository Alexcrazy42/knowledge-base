using Api.Dtos;

namespace Api.Services;

using System.Collections.Concurrent;

public class MessageQueue
{
    private readonly ConcurrentQueue<MessageDto> _messages = new();
    private readonly SemaphoreSlim _semaphore = new(0);
    
    public void Enqueue(MessageDto message)
    {
        _messages.Enqueue(message);
        _semaphore.Release();
    }
    
    public async Task<MessageDto?> DequeueAsync(CancellationToken cancellationToken = default)
    {
        await _semaphore.WaitAsync(cancellationToken);
        _messages.TryDequeue(out var message);
        return message;
    }
    
    public List<MessageDto> GetAll()
    {
        var result = new List<MessageDto>();
        while (_messages.TryDequeue(out var message))
        {
            result.Add(message);
        }
        return result;
    }
}