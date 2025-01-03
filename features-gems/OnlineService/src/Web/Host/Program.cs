using Microsoft.Extensions.Options;
using Swipty.OnlineService.Repositories;
using Swipty.OnlineService.Store.Cache.RedisConfig;
using Swipty.OnlineService.Store.Db.MongoConfig;
using Swipty.OnlineService.UseCases;

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;
var configuration = builder.Configuration;


services.AddControllers();
services.AddEndpointsApiExplorer();
services.AddSwaggerGen();


// TODO: refactor
services.ConfigureServicesToRedis(configuration);
var sp = services.BuildServiceProvider();
var redisOptions = sp.GetRequiredService<IOptions<RedisOptions>>();
new DiRedisExtension(redisOptions).AddRedis(services);

// TODO: refactor
services.ConfigureServicesToMongo(configuration);
sp = services.BuildServiceProvider();
var mongoOptions = sp.GetRequiredService<IOptions<MongoDbOptions>>();
new DiMongoExtension(mongoOptions).AddMongo(services);

services.ConfigureUseCases();
services.ConfigureRepositories();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
