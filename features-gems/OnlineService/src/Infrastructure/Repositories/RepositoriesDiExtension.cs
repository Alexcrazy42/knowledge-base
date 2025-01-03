using Microsoft.Extensions.DependencyInjection;
using Swipty.OnlineService.Domain.Interfaces.Repositories;
using Swipty.OnlineService.Repositories.Repositories;

namespace Swipty.OnlineService.Repositories;

public static class RepositoriesDiExtension
{
    public static IServiceCollection ConfigureRepositories(this IServiceCollection services)
    {
        services.AddScoped<ILastPresenceRepository, LastPresenceRepository>();
        services.AddScoped<IOnlineRepository, OnlineRepository>();
        return services;
    }
}
