using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Swipty.OnlineService.Store.Cache.RedisConfig;

public class DiRedisExtension
{
    private RedisOptions redisOptions;

    public DiRedisExtension(IOptions<RedisOptions> redisOptions)
    {
        this.redisOptions = redisOptions.Value;
    }

    public IServiceCollection AddRedis(IServiceCollection services)
    {

        var connectionString = redisOptions.GetConnectionString();
        services.AddStackExchangeRedisCache(options =>
        {
            options.InstanceName = "swpt_";
            options.Configuration = connectionString;
        });
        services.AddSingleton<IConnectionMultiplexer>(sp =>
        {
            var options = ConfigurationOptions.Parse(connectionString, true);
            return ConnectionMultiplexer.Connect(options);
        });

        return services;

    }

}
