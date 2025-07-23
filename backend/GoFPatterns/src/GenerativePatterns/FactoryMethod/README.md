# Паттерн Фабричный метод

Порождающий паттерн, который определяет интерфейс для создания объекта, но оставляет
подклассами решение о том, какой класс инстанциировать. Он позволяет делегировать создание
объектов наследниками родительского класса

Какие проблемы решает:
Гибкое создание объектов: позволяет подклассами выбирать тип создаваемого объекта
Избежание жесткой привязки к конкретным классам: Клиент работает с интерфейсом, а не с конкретными
реализациями
Расширяемость: новые типы продуктов можно добавлять, не меняя существующий код
Инкапсуляция логики создания: сложная логика инициализации скрыта в фабричном метода


Где встречается в .NET:

a) System.Net.WebRequest.Create()

```csharp
WebRequest request = WebRequest.Create("http://example.com"); // Может вернуть HttpWebRequest
request = WebRequest.Create("ftp://example.com"); // Может вернуть FtpWebRequest
```

b) System.Text.Encoding.GetEncoding()
```csharp
Encoding utf8 = Encoding.GetEncoding("UTF-8");
Encoding win1251 = Encoding.GetEncoding("Windows-1251");
```

c) Activator.CreateInstance()
```csharp
var list = (IList)Activator.CreateInstance(typeof(List<int>));
```

d) IServiceProvider.GetService() в DI
```csharp
var service = serviceProvider.GetService(typeof(ILogger)); // Фабричный метод под капотом
```
