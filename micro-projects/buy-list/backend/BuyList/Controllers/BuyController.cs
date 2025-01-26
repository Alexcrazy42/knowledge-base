using BuyList.Data;
using BuyList.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BuyList.Controllers;

[ApiController]
[Route("[controller]")]
public class BuyController : ControllerBase
{
    private readonly BuyDbContext dbContext;

    public BuyController(BuyDbContext context)
    {
        dbContext = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTodosAsync(CancellationToken ct)
    {
        var todos = await dbContext.Buys.ToListAsync(ct);

        return Ok(todos);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTodoAsync([FromBody] CreateBuyRequest request, CancellationToken ct)
    {
        var buy = new Buy(Guid.NewGuid())
        {
            Name = request.Name,
            Price = request.Price
        };

        dbContext.Buys.Add(buy);

        await dbContext.SaveChangesAsync(ct);

        return Ok(buy);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTodoAsync([FromRoute] Guid id, [FromBody] UpdateBuyRequest request,CancellationToken ct)
    {
        var buy = await dbContext.Buys.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new Exception("Buy не найдена!");

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            buy.Name = request.Name;
        }
        if (request.Price != null)
        {
            buy.Price = (decimal)request.Price;
        }

        await dbContext.SaveChangesAsync(ct);

        return NoContent();
    }


    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTodoAsync([FromRoute] Guid id, CancellationToken ct)
    {
        var buy = new Buy(id);

        dbContext.Entry(buy).State = EntityState.Deleted;

        await dbContext.SaveChangesAsync(ct);

        return NoContent();
    }

}
