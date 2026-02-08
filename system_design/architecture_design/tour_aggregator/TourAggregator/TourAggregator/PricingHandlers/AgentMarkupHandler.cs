using TourAggregator.Models;

namespace TourAggregator.PricingHandlers;

public class AgentMarkupHandler : PricingHandlerBase
{
    protected override async Task ProcessAsync(TourContext context, CancellationToken ct)
    {
        var oldPrice = context.Price;
        var markupPercent = 5;
        
        context.Price *= 1 + markupPercent / 100m;
    }
}
