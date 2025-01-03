using Swipty.OnlineService.Domain.Contracts;
using Swipty.OnlineService.Domain.Entities;

namespace Swipty.OnlineService.Domain.Interfaces.UseCases;

public interface IPresenceUseCases
{
    public Task<IReadOnlyCollection<Presence>> GetPresencesByIdsAsync(IReadOnlyCollection<string> userIds, CancellationToken ct);

    public Task SendOnlineStatusAsync(OnlineStatusRequest request, CancellationToken ct);
}
