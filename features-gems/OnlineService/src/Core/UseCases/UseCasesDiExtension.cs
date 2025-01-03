using Microsoft.Extensions.DependencyInjection;
using Swipty.OnlineService.Domain.Interfaces.UseCases;
using Swipty.OnlineService.UseCases.UseCases;

namespace Swipty.OnlineService.UseCases;

public static class UseCasesDiExtension
{
    public static IServiceCollection ConfigureUseCases(this IServiceCollection services)
    {
        services.AddScoped<IPresenceUseCases, PresenceUseCases>();
        return services;
    }
}
