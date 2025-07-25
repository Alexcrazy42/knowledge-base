# Фасад

Структурный паттерн проектирования, который предоставляет простой интерфейс
для работы со сложной подсистемой (например, библиотекой, фреймворком
или набором классов)

Проблемы, которые решает:
1. сложность взаимодействия
2. зависимость от внутренней логики
3. трудности при тестировании (моках)

Примеры из .NET:

1. HttpClient — фасад для работы с HTTP
Вместо ручного создания HttpWebRequest, настройки заголовков и чтения Stream,
можно использовать простой метод:
```csharp
var client = new HttpClient(); // Фасад
var response = await client.GetStringAsync("https://api.example.com/data"); // Упрощённый API
```

Что скрыто за фасадом:
Работа с HttpWebRequest/HttpWebResponse.
Управление соединениями (Keep-Alive, Timeout).
Парсинг заголовков и тела ответа.


2. File — фасад для работы с файлами
   Вместо работы с FileStream, BinaryReader и кодировками:
```csharp
// Чтение файла (Фасад)
string content = File.ReadAllText("file.txt");

// Запись файла (Фасад)
File.WriteAllText("file.txt", "Hello, Facade!");
```
