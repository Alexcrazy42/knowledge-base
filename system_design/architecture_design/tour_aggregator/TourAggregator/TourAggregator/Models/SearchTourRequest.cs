namespace TourAggregator.Models;

public class SearchTourRequest
{
    public string CityFrom { get; set; }
    
    public string CityTo { get; set; }
    
    public DateTime StartDate { get; set; }
    
    public DateTime EndDate { get; set; }
}