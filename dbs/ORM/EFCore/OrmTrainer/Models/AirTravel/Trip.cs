using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrmTrainer.Models.AirTravel;

public class Trip
{
    [Key]
    [DisplayName("id")]
    public int Id { get; set; }
    
    [ForeignKey("company_id")]
    public int CompanyId { get; set; }
    
    public Company Company { get; set; }
    
    [MaxLength(100)]
    [DisplayName("plane")]
    public string Plane { get; set; }
    
    [DisplayName("town_from")]
    public string TownFrom { get; set; }
    
    [DisplayName("town_to")]
    public string TownTo { get; set; }
    
    [DisplayName("time_out")]
    public DateTimeOffset TimeOut { get; set; }
    
    [DisplayName("time_in")]
    public DateTimeOffset TimeIn { get; set; }
}