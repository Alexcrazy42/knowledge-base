using MongoDB.Driver;
using Swipty.OnlineService.Domain.Entities;
using Swipty.OnlineService.Domain.Interfaces.Repositories;
using Swipty.OnlineService.Store.Db;

namespace Swipty.OnlineService.Repositories.Repositories;

internal class LastPresenceRepository : ILastPresenceRepository
{
    private readonly IMongoCollection<LastPresence> lastPresenceCollection;

    public LastPresenceRepository(MongoCollections mongoCollections)
    {
        lastPresenceCollection = mongoCollections.GetLastPresenceCollection();
    }

    public async Task<IReadOnlyCollection<LastPresence>> GetLastPresencesByIdsAsync(IReadOnlyCollection<string> userIds, CancellationToken ct)
    {
        var filter = Builders<LastPresence>.Filter.In(x => x.UserId, userIds);
        var lastPresences = await lastPresenceCollection
            .Find(filter)
            .ToListAsync(ct);

        return lastPresences;
    }
}
