using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace OrmTrainer.Models.AirTravel;

public class Company
{
    [Key]
    [DisplayName("id")]
    public int Id { get; set; }
    
    [MaxLength(100)]
    [DisplayName("name")]
    public string Name { get; set; }
}