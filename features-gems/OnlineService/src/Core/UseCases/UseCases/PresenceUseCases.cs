using Swipty.OnlineService.Domain.Contracts;
using Swipty.OnlineService.Domain.Entities;
using Swipty.OnlineService.Domain.Enums;
using Swipty.OnlineService.Domain.Interfaces.Repositories;
using Swipty.OnlineService.Domain.Interfaces.UseCases;

namespace Swipty.OnlineService.UseCases.UseCases;

internal class PresenceUseCases : IPresenceUseCases
{
    private readonly IOnlineRepository onlineRepository;
    private readonly ILastPresenceRepository lastPresenceRepository;

    public PresenceUseCases(IOnlineRepository onlineRepository,
        ILastPresenceRepository lastPresenceRepository)
    {
        this.onlineRepository = onlineRepository;
        this.lastPresenceRepository = lastPresenceRepository;
    }


    public async Task<IReadOnlyCollection<Presence>> GetPresencesByIdsAsync(IReadOnlyCollection<string> userIds, CancellationToken ct)
    {
        var res = new List<Presence>();


        var onlineUsers = await onlineRepository.GetOnlinesByIdsAsync(userIds, ct);

        

        var notOnlineUserIds = new List<string>();

        if (onlineUsers.Count == 0)
        {
            notOnlineUserIds.AddRange(userIds);
        }
        foreach (var userId in onlineUsers.Keys)
        {
            var device = DeviceEnum.IOS;
            if (onlineUsers.TryGetValue(userId, out device))
            {
                var presence = new Presence(new Online(userId, device));
                res.Add(presence);
            }
            else
            {
                notOnlineUserIds.Add(userId);
            }
        }

        var lastPresencesOfNotOnlineUsers = await lastPresenceRepository.GetLastPresencesByIdsAsync(userIds, ct);

        foreach (var lastPresence in lastPresencesOfNotOnlineUsers)
        {
            var presence = new Presence(lastPresence);
            res.Add(presence);
        }

        return res;
    }

    public async Task SendOnlineStatusAsync(OnlineStatusRequest request, CancellationToken ct)
    {
        await onlineRepository.SendOnlineStatusAsync(request, ct);
    }
}
