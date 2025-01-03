using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Swipty.OnlineService.Store.Db.MongoConfig;

public static class MongoModuleStartup
{
    public static void ConfigureServicesToMongo(this IServiceCollection services, IConfiguration configuration)
    {
        if (services == null)
            throw new ArgumentNullException(nameof(services));

        services.Configure<MongoDbOptions>(configuration);
    }

}