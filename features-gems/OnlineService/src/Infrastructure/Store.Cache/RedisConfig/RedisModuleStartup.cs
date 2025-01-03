using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Swipty.OnlineService.Store.Cache.RedisConfig;

public static class RedisModuleStartup
{
    public static void ConfigureServicesToRedis(this IServiceCollection services, IConfiguration configuration)
    {
        if (services == null)
        {
            throw new ArgumentNullException("services");
        }

        services.Configure<RedisOptions>(configuration);
    }

}
