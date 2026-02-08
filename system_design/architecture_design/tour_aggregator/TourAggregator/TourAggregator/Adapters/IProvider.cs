using TourAggregator.Models;

namespace TourAggregator.Adapters;

public interface IProvider
{
    Task<List<BaseTour>> GetTours(SearchTourRequest request, CancellationToken ct);
}