using TourAggregator.Models;

namespace TourAggregator.PricingHandlers;

public class PricingPipeline
{
    private readonly IPricingHandler _pipeline;

    public PricingPipeline(
        CurrencyConversionHandler currencyHandler,
        AgentMarkupHandler markupHandler,
        SeasonalCoefficientHandler seasonalHandler
        )
    {
        currencyHandler
            .SetNext(markupHandler)
            .SetNext(seasonalHandler);
        
        _pipeline = currencyHandler;
    }

    public async Task<TourContext> CalculatePriceAsync(TourContext context, CancellationToken ct = default)
    {
        return await _pipeline.HandleAsync(context, ct);
    }
}