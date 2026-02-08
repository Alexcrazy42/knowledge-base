using TourAggregator.Models;

namespace TourAggregator.PricingHandlers;

public class CurrencyConversionHandler : PricingHandlerBase
{

    public CurrencyConversionHandler()
    {
    }

    protected override async Task ProcessAsync(TourContext context, CancellationToken ct)
    {
        if (context.Currency == "RUB")
        {
            return; // Уже в нужной валюте
        }

        var oldPrice = context.Price;
        var rate = 100;
        
        context.Price *= rate;
        context.Currency = "RUB";
    }
}

public interface ICurrencyConverter
{
    Task<decimal> GetRateAsync(string contextCurrency, string rub, CancellationToken ct);
}