# Паттерн Строитель

Порождающий паттерн, помогающий строить сложные объекты пошагово, отделяя конструирование
объекта от его представления. Он особенно полезен, когда объект требует множества параметров
или этапов инициализации

Какие проблемы решает:
упрощение создания сложных объектов. пример: HttpClient с настройками прокси, таймаутами и
заголовками
избежание "телескопических конструкторов": вместо конструктором с 10+ параметрами используется
цеопочка методов
гибкость: позволяет создавать разные представления объекта, используя один и тот же процесс конструирования
инкапсуляция логики создания: клиент не знает деталей сборки объекта

Примеры из дотнет:

HostBuilder
```csharp
Host.CreateDefaultBuilder()
    .ConfigureServices(services => { /* ... */ })
    .ConfigureLogging(logging => { /* ... */ })
    .Build(); // Возвращает IHost
```

DbContextOptionsBuilder
```csharp
services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
           .EnableSensitiveDataLogging());
```

ConfigurationBuilder
```csharp
var config = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json")
    .AddEnvironmentVariables()
    .Build();
```

ServiceCollection
```csharp
services.AddControllers()
        .AddNewtonsoftJson()
        .AddXmlSerializerFormatters();
```
