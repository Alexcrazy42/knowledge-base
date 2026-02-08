using TourAggregator.Models;

namespace TourAggregator.PricingHandlers.DiscountStrategies;

public class EarlyBookingDiscountStrategy : IDiscountStrategy
{
    public string Name => "Early Booking";

    public Task<bool> IsApplicableAsync(TourContext context, CancellationToken ct)
    {
        var daysUntilDeparture = (context.DateTo.ToDateTime(new TimeOnly()) - context.DateFrom.ToDateTime(new TimeOnly())).Days;
        return Task.FromResult(daysUntilDeparture > 60);
    }

    public Task<decimal> CalculateDiscountAsync(TourContext context, CancellationToken ct)
    {
        return Task.FromResult(context.Price * 0.10m); // 10%
    }

    public Task<string> GetDescriptionAsync(TourContext context, CancellationToken ct)
    {
        var daysUntilDeparture = (context.DateTo.ToDateTime(new TimeOnly()) - context.DateFrom.ToDateTime(new TimeOnly())).Days;
        return Task.FromResult($"Early booking discount (booked {daysUntilDeparture} days in advance) - 10% off");
    }
}