using TourAggregator.Models;

namespace TourAggregator.PricingHandlers.DiscountStrategies;

// Постоянный клиент
public class LoyaltyDiscountStrategy : IDiscountStrategy
{
    public string Name => "Loyalty";

    public Task<bool> IsApplicableAsync(TourContext context, CancellationToken ct)
    {
        var result = Random.Shared.NextDouble() > 0.5;
        return Task.FromResult(result);
    }

    public Task<decimal> CalculateDiscountAsync(TourContext context, CancellationToken ct)
    {
        return Task.FromResult(context.Price * 0.05m); // 5%
    }

    public Task<string> GetDescriptionAsync(TourContext context, CancellationToken ct)
    {
        return Task.FromResult("Loyalty discount (previous purchases) - 5% off");
    }
}