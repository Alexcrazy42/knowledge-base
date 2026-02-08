namespace TourAggregator.Models;

public class TourContext
{
    public string Id { get; set; }
    
    public string TourOperator { get; set; }
    
    public string TourOperatorId { get; set; }
    
    public string Name { get; set; }
    
    public string HotelName { get; set; }
    
    public DateOnly DateFrom { get; set; }
    
    public DateOnly DateTo { get; set; }
    
    public decimal Price { get; set; }
    
    public string Currency { get; set; }

    public List<Sale> Sales { get; set; } = [];


    public void AddSale(Sale sale)
    {
        Sales.Add(sale);
    }
}

public static class Extensions1
{
    public static TourContext ToTourContext(this BaseTour tour)
    {
        return new TourContext()
        {
            Id = tour.Id,
            TourOperator = tour.TourOperator,
            TourOperatorId = tour.TourOperatorId,
            Name = tour.Name,
            HotelName = tour.HotelName,
            DateFrom = tour.DateFrom,
            DateTo = tour.DateTo,
            Price = tour.Price,
            Currency = tour.Currency,
            Sales = tour.Sales
        };
    }
}