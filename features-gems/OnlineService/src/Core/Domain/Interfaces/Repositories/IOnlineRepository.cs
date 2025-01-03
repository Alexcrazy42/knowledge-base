using Swipty.OnlineService.Domain.Contracts;
using Swipty.OnlineService.Domain.Entities;
using Swipty.OnlineService.Domain.Enums;

namespace Swipty.OnlineService.Domain.Interfaces.Repositories;

public interface IOnlineRepository
{
    /// <summary>
    /// Получить информацию о том, онлайн ли пользователи
    /// </summary>
    /// <param name="userIds"></param>
    /// <param name="ct"></param>
    /// <returns></returns>
    public Task<IDictionary<string, DeviceEnum>> GetOnlinesByIdsAsync(IReadOnlyCollection<string> userIds, CancellationToken ct);

    public Task SendOnlineStatusAsync(OnlineStatusRequest request, CancellationToken ct);
}
