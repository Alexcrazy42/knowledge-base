using TourAggregator.Adapters;
using TourAggregator.Models;
using TourAggregator.PricingHandlers;


var pricingPipeline = new PricingPipeline(
    currencyHandler: new CurrencyConversionHandler(),
    markupHandler: new AgentMarkupHandler(),
    seasonalHandler: new SeasonalCoefficientHandler());


var resolver = new AdapterResolver();

var request = new SearchTourRequest();
var provider = await resolver.GetProvider(request, CancellationToken.None);


var tours = await provider.GetTours(request, CancellationToken.None);
var tourContexts = tours.Select(Extensions1.ToTourContext).ToList();

var finalContext = await pricingPipeline.CalculatePriceAsync(tourContexts.First(), CancellationToken.None);
var tour = finalContext.ToBaseTour();

Console.WriteLine(tour.ToString());