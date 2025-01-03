using System.ComponentModel.DataAnnotations;

namespace OrmTrainer.Models.Schedule;

public class Teacher
{
    [Key]
    public int Id { get; set; }
    
    public string FirstName { get; set; }
    
    public string MiddleName { get; set; }
    
    public string LastName { get; set; }
}