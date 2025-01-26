using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using RealTimeChat.Data;
using RealTimeChat.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddStackExchangeRedisCache(options =>
{
    var connection = builder.Configuration.GetConnectionString("Redis");
    Console.WriteLine(connection);
    options.Configuration = connection;
});

builder.Services.AddDbContext<ChatDbContext>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllOrigins", builder =>
    {
        builder.WithOrigins("https://varya.polyk.space")
               .AllowAnyHeader()
               .AllowAnyMethod()
               .AllowCredentials();
    });
});


builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Chat Web Api",
        Version = "v1"
    });
});


builder.Services.AddControllers();

builder.Services.AddSignalR();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseRouting();

app.UseCors("AllowAllOrigins");

app.MapHub<ChatHub>("/chat");

app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();

using (var serviceScope = app.Services.GetRequiredService<IServiceScopeFactory>().CreateScope())
{
    var context = serviceScope.ServiceProvider.GetRequiredService<ChatDbContext>();
    context.Database.Migrate();
}

app.Run();