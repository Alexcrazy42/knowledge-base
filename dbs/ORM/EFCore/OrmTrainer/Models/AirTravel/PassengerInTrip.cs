using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrmTrainer.Models.AirTravel;

public class PassengerInTrip
{
    [Key]
    [DisplayName("id")]
    public int Id { get; set; }
    
    [ForeignKey("trip_id")]
    public int TripId { get; set; }
    
    public Trip Trip { get; set; }
    
    [ForeignKey("passenger_id")]
    public int PassengerId { get; set; }
    
    public Passenger Passenger { get; set; }
    
    [MaxLength(100)]
    [DisplayName("place")]
    public string Place { get; set; }
}