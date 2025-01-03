using Microsoft.AspNetCore.Mvc;
using Swipty.OnlineService.Domain.Contracts;
using Swipty.OnlineService.Domain.Entities;
using Swipty.OnlineService.Domain.Enums;
using Swipty.OnlineService.Domain.Interfaces.UseCases;

namespace Swipty.OnlineService.Host.Controllers;

[ApiController]
[Route("api/online")]
public class OnlineController : ControllerBase
{
    private readonly IPresenceUseCases presenceUseCases;

    public OnlineController(IPresenceUseCases userStatusUseCases)
    {
        this.presenceUseCases = userStatusUseCases;
    }

    [HttpPost("online-users")]
    public async Task<IReadOnlyCollection<Presence>> GetUserOnlineStatuses([FromBody] IReadOnlyCollection<string> userIds, CancellationToken ct)
    {
        return await presenceUseCases.GetPresencesByIdsAsync(userIds, ct);
    }

    [HttpPost]
    public async Task SendOnlineStatusAsync([FromBody] OnlineStatusRequest request, CancellationToken ct)
    {
        await presenceUseCases.SendOnlineStatusAsync(request, ct);
    }
}

