using MongoDB.Driver;
using Swipty.OnlineService.Domain.Entities;
using Swipty.OnlineService.Store.Db.MongoConfig;

namespace Swipty.OnlineService.Store.Db;

public class MongoCollections
{
    private MongoDbOptions options;

    public MongoCollections(MongoDbOptions options)
    {
        this.options = options;
    }

    public IMongoCollection<T> ConnectToMongo<T>(string collection)
    {
        var client = new MongoClient(options.ConnectionString);
        var db = client.GetDatabase(MongoNaming.DbName);
        return db.GetCollection<T>(collection);
    }


    public IMongoCollection<LastPresence> GetLastPresenceCollection()
    {
        return ConnectToMongo<LastPresence>(MongoNaming.LastPresenceCollectionName);
    }

}
