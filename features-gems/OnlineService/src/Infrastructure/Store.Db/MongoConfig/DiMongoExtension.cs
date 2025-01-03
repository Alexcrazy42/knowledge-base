using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Swipty.OnlineService.Store.Db.MongoConfig;

public class DiMongoExtension
{
    private MongoDbOptions mongoOptions;

    public DiMongoExtension(IOptions<MongoDbOptions> mongoOptions)
    {
        this.mongoOptions = mongoOptions.Value;
    }

    public IServiceCollection AddMongo(IServiceCollection services)
    {
        mongoOptions.ConnectionString = mongoOptions.GetConnectionString();
        services.AddSingleton<MongoCollections>();
        services.AddSingleton<MongoDbOptions>(mongoOptions);
        return services;
    }

}
