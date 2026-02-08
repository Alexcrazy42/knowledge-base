namespace TourAggregator.Models;

public class Sale
{
    public string Reason { get; set; }
    
    public decimal OldPrice { get; set; }
    
    public decimal NewPrice { get; set; }
    
    public int Percent { get; set; }
}