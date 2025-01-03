using Amazon.Runtime.Internal.Transform;
using Microsoft.Extensions.Caching.Distributed;
using MongoDB.Driver;
using Newtonsoft.Json;
using StackExchange.Redis;
using Swipty.OnlineService.Domain.Contracts;
using Swipty.OnlineService.Domain.Entities;
using Swipty.OnlineService.Domain.Enums;
using Swipty.OnlineService.Domain.Interfaces.Repositories;
using Swipty.OnlineService.Store.Db;

namespace Swipty.OnlineService.Repositories.Repositories;

internal class OnlineRepository : IOnlineRepository
{
    private readonly IDatabase database;
    private readonly IDistributedCache cache;
    private readonly IMongoCollection<LastPresence> lastPresenceCollection;

    public OnlineRepository(IConnectionMultiplexer connectionMultiplexer,
        IDistributedCache cache,
        MongoCollections mongoCollections)
    {
        database = connectionMultiplexer.GetDatabase();
        this.cache = cache;
        lastPresenceCollection = mongoCollections.GetLastPresenceCollection();
    }

    public async Task<IDictionary<string, DeviceEnum>> GetOnlinesByIdsAsync(IReadOnlyCollection<string> userIds, CancellationToken ct)
    {
        var result = new Dictionary<string, DeviceEnum>();

        foreach (var userId in userIds)
        {
            var isUserOnlineString = await cache.GetStringAsync(userId, ct);

            if (isUserOnlineString != null)
            {
                var onlineStatusRequest = JsonConvert.DeserializeObject<OnlineStatusRequest>(isUserOnlineString);
                result[userId] = onlineStatusRequest.Device;   
            }
        };
        return result;
    }

    public async Task SendOnlineStatusAsync(OnlineStatusRequest request, CancellationToken ct)
    {
        var requestToString = JsonConvert.SerializeObject(request);

        var filter = Builders<LastPresence>.Filter.Eq(x =>  x.UserId, request.UserId);

        var res = await lastPresenceCollection.Find(filter).FirstOrDefaultAsync(ct);

        if (res == null)
        {
            var add = new LastPresence(
                request.UserId,
                DateTime.UtcNow,
                request.Device
            );

            await lastPresenceCollection.InsertOneAsync(add, ct);
        }
        else
        {
            var update = Builders<LastPresence>.Update.Set(x => x.LastVisitedAt, DateTime.UtcNow);
            await lastPresenceCollection.UpdateOneAsync(filter, update);
        }


        await cache.SetStringAsync("online", requestToString, 
            new DistributedCacheEntryOptions()
            {
                AbsoluteExpiration = DateTimeOffset.UtcNow.AddMinutes(3)
            },
            ct);
    }
}
