using System.ComponentModel.DataAnnotations;

namespace OrmTrainer.Models.Schedule;

public class Subject
{
    [Key]
    public int Id { get; set; }
    
    public string Name { get; set; }
}