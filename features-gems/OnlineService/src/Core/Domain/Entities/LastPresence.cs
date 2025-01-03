using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson;
using Swipty.OnlineService.Domain.Enums;

namespace Swipty.OnlineService.Domain.Entities;

public class LastPresence
{
    [BsonId]
    public string UserId { get; set; }

    public DateTime LastVisitedAt { get; set; }

    public DeviceEnum Device { get; set; }

    public LastPresence(string userId,
        DateTime lastVisitedAt, 
        DeviceEnum device)
    {
        UserId = userId;
        LastVisitedAt = lastVisitedAt;
        Device = device;
    }
}
