using TourAggregator.Models;

namespace TourAggregator.PricingHandlers;

public interface IPricingHandler
{
    Task<TourContext> HandleAsync(TourContext context, CancellationToken ct);
}