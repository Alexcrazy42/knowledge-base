using Swipty.OnlineService.Domain.Enums;

namespace Swipty.OnlineService.Domain.Entities;

public class Presence
{
    /// <summary>
    /// Id пользователя из SSO
    /// </summary>
    public string UserId { get; set; }

    public bool IsOnline { get; set; }

    /// <summary>
    /// Устройство, с которого либо пользователь онлайн, 
    /// либо он заходил последний раз с него в сеть
    /// </summary>
    public DeviceEnum Device { get; set; }

    /// <summary>
    /// Последняя дата визита
    /// </summary>
    public DateTime? LastVisitedAt { get; set; }

    public Presence(Online onlineStatus)
    {
        UserId = onlineStatus.UserId;
        IsOnline = true;
        Device = onlineStatus.Device;
        LastVisitedAt = null;
    }

    public Presence(LastPresence userLastPresence)
    {
        UserId = userLastPresence.UserId;
        IsOnline = false;
        Device = userLastPresence.Device;
        LastVisitedAt = userLastPresence.LastVisitedAt;
    }
}
