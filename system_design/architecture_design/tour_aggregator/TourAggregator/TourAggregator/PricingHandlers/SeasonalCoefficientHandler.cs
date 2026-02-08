using TourAggregator.Models;

namespace TourAggregator.PricingHandlers;

public class SeasonalCoefficientHandler : PricingHandlerBase
{

    public SeasonalCoefficientHandler()
    {
    }

    protected override async Task ProcessAsync(TourContext context, CancellationToken ct)
    {
        var oldPrice = context.Price;
        var coefficient = 0.8m;
        
        context.Price *= coefficient;
        
        var change = (coefficient - 1) * 100;

        if (change < 0)
        {
            var sale = new Sale()
            {
                Reason = "Seasonal coeff",
                OldPrice = oldPrice,
                NewPrice = context.Price,
                Percent = Math.Abs((int)change)
            };
            context.AddSale(sale);
        }
    }
}