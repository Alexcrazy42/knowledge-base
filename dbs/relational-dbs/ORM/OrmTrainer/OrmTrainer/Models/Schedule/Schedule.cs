using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrmTrainer.Models.Schedule;

public class Schedule
{
    [Key]
    public int Id { get; set; }
    
    public DateOnly Date { get; set; }
    
    public int ClassId { get; set; }
    
    public SchoolClass Class { get; set; }
    
    public int TimepairId { get; set; }
    
    [ForeignKey("TimepairId")]
    public Timepair Timepair { get; set; }
    
    public int TeacherId { get; set; }
    
    public Teacher Teacher { get; set; }
    
    public int SubjectId { get; set; }
    
    public Subject Subject { get; set; }
    
    public int Classroom { get; set; }
}