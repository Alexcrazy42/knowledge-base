using System.ComponentModel.DataAnnotations;

namespace OrmTrainer.Models.Schedule;

public class StudentInClass
{
    [Key]
    public int Id { get; set; }
    
    public int ClassId { get; set; }
    
    public SchoolClass Class { get; set; }
    
    public int StudentId { get; set; }
    
    public Student Student { get; set; }
}