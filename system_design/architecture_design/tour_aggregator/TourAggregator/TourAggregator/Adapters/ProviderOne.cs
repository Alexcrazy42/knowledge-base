using TourAggregator.Models;

namespace TourAggregator.Adapters;

// здесь бы мы определили контракты внешние, интерфейс и адаптера
public class ProviderOne : IProvider
{
    public Task<List<BaseTour>> GetTours(SearchTourRequest request, CancellationToken ct)
    {
        var tour = new BaseTour()
        {
            Id = Guid.NewGuid().ToString(),
            TourOperator = "Provider1",
            TourOperatorId = Guid.NewGuid().ToString(),
            Name = "TourName",
            HotelName = "hotel",
            DateFrom = new DateOnly(2026, 2, 1),
            DateTo = new DateOnly(2026, 2, 9),
            Price = 180,
            Currency = "USD",
            Sales = []
        };
        return Task.FromResult(new List<BaseTour> { tour });
    }
}