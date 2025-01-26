namespace BuyList.Models;

public class Buy
{
    public Guid Id { get; set; }

    public string Name { get; set; }

    public decimal Price { get; set; }

    public Buy(Guid id)
    {
        Id = id;
    }

}
