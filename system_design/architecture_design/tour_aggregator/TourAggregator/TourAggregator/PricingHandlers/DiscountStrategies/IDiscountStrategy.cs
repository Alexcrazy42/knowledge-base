using TourAggregator.Models;

namespace TourAggregator.PricingHandlers.DiscountStrategies;

public interface IDiscountStrategy
{
    string Name { get; }
    Task<bool> IsApplicableAsync(TourContext context, CancellationToken ct);
    Task<decimal> CalculateDiscountAsync(TourContext context, CancellationToken ct);
    Task<string> GetDescriptionAsync(TourContext context, CancellationToken ct);
}
