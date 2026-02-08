using TourAggregator.Models;

namespace TourAggregator.PricingHandlers;

public abstract class PricingHandlerBase : IPricingHandler
{
    private IPricingHandler? _next;

    public PricingHandlerBase SetNext(IPricingHandler handler)
    {
        _next = handler;
        return this;
    }

    public virtual async Task<TourContext> HandleAsync(TourContext context, CancellationToken ct)
    {
        await ProcessAsync(context, ct);
        
        if (_next != null)
        {
            return await _next.HandleAsync(context, ct);
        }
        
        return context;
    }

    protected abstract Task ProcessAsync(TourContext context, CancellationToken ct);
}