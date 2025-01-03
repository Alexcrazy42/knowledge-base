using Swipty.OnlineService.Domain.Enums;

namespace Swipty.OnlineService.Domain.Contracts;

public class OnlineStatusRequest
{
    public string UserId { get; set; }

    public DeviceEnum Device { get; set; }
}