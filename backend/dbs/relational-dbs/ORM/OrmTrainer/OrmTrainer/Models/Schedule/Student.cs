using System.ComponentModel.DataAnnotations;

namespace OrmTrainer.Models.Schedule;

public class Student
{
    [Key]
    public int Id { get; set; }
    
    public string FirstName { get; set; }
    
    public string MiddleName { get; set; }
    
    public string LastName { get; set; }
    
    public DateOnly BirthDate { get; set; }
    
    public string Address { get; set; }
}