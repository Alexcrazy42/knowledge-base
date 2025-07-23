# Паттерн одиночка

a) HttpClient (в ASP.NET Core)

Хотя HttpClient не является классическим Singleton, его рекомендуется регистрировать как
Singleton в DI-контейнере, чтобы избежать проблем с исчерпанием сокетов:

```csharp
services.AddSingleton<HttpClient>();
```

b) IConfiguration в ASP.NET Core

```csharp
var config = serviceProvider.GetService<IConfiguration>();
```

c) ILogger

```csharp
ILogger logger = LogManager.GetCurrentClassLogger(); // NLog
```

d) System.Runtime.Caching.MemoryCache

```csharp
var cache = MemoryCache.Default; // Готовый Singleton
```
