using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace OrmTrainer.Models.Schedule;

public class SchoolClass
{
    [Key]
    [DisplayName("id")]
    public int Id { get; set; }
    
    [MaxLength(100)]
    [DisplayName("name")]
    public string Name { get; set; }
}