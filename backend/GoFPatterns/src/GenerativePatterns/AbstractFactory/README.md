# Абстрактная фабрика

Порождающий паттерн, представляющий интерфейс для создания семейств связанных или
зависимых объектов, не указывая их конкретных классов.

Основные задачи:
создание групп взаимосвязанных объектов. Например UI-элементы в одном стиле, мебель одного дизайна
изоляция кода от конкретных классов. Клиент работает только с интерфейсами, а не с реализациями
Гарантия совместимости объектов, нельзя смешать классический стул с модерновым - фабрика создает только согласованные объекты
упрощение поддержки новых вариаций. добавление нового семейства не требует изменения существующего кода


Где встречается в .NET:
1. System.Data.Common.DbProviderFactory

```csharp
DbProviderFactory factory = SqlClientFactory.Instance;
DbConnection connection = factory.CreateConnection(); // SqlConnection
DbCommand command = factory.CreateCommand(); // SqlCommand

// Для SQLite
factory = SQLiteFactory.Instance;
connection = factory.CreateConnection(); // SQLiteConnection
```

2. Microsoft.Extensions.Logging.ILoggerFactory

```csharp
ILoggerFactory factory = LoggerFactory.Create(builder =>
    builder.AddConsole());

ILogger logger = factory.CreateLogger<Program>();
```

3. Microsoft.Extensions.DependencyInjection

```csharp
var services = new ServiceCollection();
services.AddSingleton<IHttpClient, HttpClient>(); // "Продукт"
var provider = services.BuildServiceProvider(); // "Фабрика"

var client = provider.GetService<IHttpClient>(); // Создание объекта
```
