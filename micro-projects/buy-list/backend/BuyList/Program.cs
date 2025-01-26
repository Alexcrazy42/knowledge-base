using BuyList.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BuyList Web Api",
        Version = "v1"
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllOrigins", builder =>
    {
        builder
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});
builder.Services.AddDbContext<BuyDbContext>();


var app = builder.Build();

app.UseHttpsRedirection();
app.UseRouting();

app.UseCors("AllowAllOrigins");

app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();

using (var serviceScope = app.Services.GetRequiredService<IServiceScopeFactory>().CreateScope())
{
    var context = serviceScope.ServiceProvider.GetService<BuyDbContext>();
    context.Database.Migrate();
}


app.Run();
