namespace Swipty.OnlineService.Store.Db.MongoConfig;

public class MongoDbOptions
{
    public string ConnectionString { get; set; }

    public string MongoDb_Host { get; set; } = String.Empty;

    public string MongoDb_Port { get; set; } = String.Empty;

    public string MongoDb_User { get; set; } = String.Empty;

    public string MongoDb_Password { get; set; } = String.Empty;

    public string GetConnectionString()
    {
        return $"mongodb://{MongoDb_Host}:{MongoDb_Port}";
        var connectionString = string.IsNullOrEmpty(MongoDb_User) ?
            $"mongodb://{MongoDb_Host}:{MongoDb_Port}" :
            $"mongodb://{MongoDb_User}:{MongoDb_Password}@{MongoDb_Host}:{MongoDb_Port}";
        return connectionString;
    }

}
