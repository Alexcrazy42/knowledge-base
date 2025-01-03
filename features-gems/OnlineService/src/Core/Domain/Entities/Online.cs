using Swipty.OnlineService.Domain.Enums;

namespace Swipty.OnlineService.Domain.Entities;

public class Online
{
    public string UserId { get; set; }

    public DeviceEnum Device { get; set; }

    public Online(string userId, DeviceEnum device)
    {
        UserId = userId;
        Device = device;
    }
}