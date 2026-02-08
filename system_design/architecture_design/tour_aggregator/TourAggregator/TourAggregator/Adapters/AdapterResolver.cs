using TourAggregator.Models;

namespace TourAggregator.Adapters;

public class AdapterResolver
{
    public Task<IProvider> GetProvider(SearchTourRequest request, CancellationToken ct)
    {
        return Task.FromResult((IProvider)new ProviderOne());
    }
}