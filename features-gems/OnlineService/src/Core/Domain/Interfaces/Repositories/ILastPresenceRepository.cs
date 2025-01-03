using Swipty.OnlineService.Domain.Entities;

namespace Swipty.OnlineService.Domain.Interfaces.Repositories;

public interface ILastPresenceRepository
{
    /// <summary>
    /// Получить информацию о том, когда пользователи 
    /// в последний раз были в сети
    /// </summary>
    /// <param name="userIds"></param>
    /// <param name="ct"></param>
    /// <returns></returns>
    public Task<IReadOnlyCollection<LastPresence>> GetLastPresencesByIdsAsync(IReadOnlyCollection<string> userIds, CancellationToken ct);
}
