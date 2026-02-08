using System.Text;

namespace TourAggregator.Models;

public class BaseTour
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
    
    public List<Sale> Sales { get; set; }

    public override string ToString()
    {
        var sb = new StringBuilder();
    
        sb.AppendLine($"╔═══════════════════════════════════════════════════════╗");
        sb.AppendLine($"║ Tour: {Name,-45} ║");
        sb.AppendLine($"╠═══════════════════════════════════════════════════════╣");
        sb.AppendLine($"║ ID:            {Id,-35} ║");
        sb.AppendLine($"║ Hotel:         {HotelName,-35} ║");
        sb.AppendLine($"║ Operator:      {TourOperator,-35} ║");
        sb.AppendLine($"║ Operator ID:   {TourOperatorId,-35} ║");
        sb.AppendLine($"║ Price:         {Price:N2} {Currency,-28} ║");
    
        if (Sales?.Count > 0)
        {
            sb.AppendLine($"╠═══════════════════════════════════════════════════════╣");
            sb.AppendLine($"║ Sales ({Sales.Count}):{"",-43} ║");
        
            foreach (var sale in Sales)
            {
                var change = sale.NewPrice - sale.OldPrice;
                var sign = change >= 0 ? "+" : "";
                sb.AppendLine($"║   • {sale.Reason,-30} -{sale.Percent}% ║");
                sb.AppendLine($"║     {sale.OldPrice:N2} -> {sale.NewPrice:N2} ({sign}{change:N2})     ║");
            }
        }
    
        sb.AppendLine($"╚═══════════════════════════════════════════════════════╝");
    
        return sb.ToString();
    }
}

public static class Extensions
{
    public static BaseTour ToBaseTour(this TourContext context)
    {
        return new BaseTour()
        {
            Id = context.Id,
            TourOperator = context.TourOperator,
            TourOperatorId = context.TourOperatorId,
            Name = context.Name,
            HotelName = context.HotelName,
            Price = context.Price,
            Currency = context.Currency,
            Sales = context.Sales
        };
    }
}