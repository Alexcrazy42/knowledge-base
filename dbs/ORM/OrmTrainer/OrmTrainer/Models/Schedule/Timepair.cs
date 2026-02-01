using System.ComponentModel.DataAnnotations;

namespace OrmTrainer.Models.Schedule;

public class Timepair
{
    [Key]
    public int Id { get; set; }
    
    public DateTime StartTime { get; set; }
    
    public DateTime EndTime { get; set; }
}