# Декоратор

структурный паттерн проектирования, который позволяет добавлять новую
функциональность объектам, не изменяя их исходный код

Проблемы:
жесткая иерархия наследования
нарушение Open-Closed принципа: приходится модифицировать существующие классы,
чтобы добавить новую функциональность

Решение:
создаем обертки (декораторы), которые добавляют поведение на лету
декоратор реализует тот же интерфейс, что и исходный объект, поэтому клиентский
код не замечает разницы

Примеры из дотнета:

Потоки данных (System.IO)
Классы Stream в .NET — классический пример Декоратора:
FileStream, MemoryStream — базовые потоки.
BufferedStream, GZipStream, CryptoStream — декораторы, добавляющие буферизацию,
сжатие или шифрование.

```csharp
using (var fileStream = new FileStream("file.txt", FileMode.Open))
using (var gzipStream = new GZipStream(fileStream, CompressionMode.Compress)) // Декоратор
using (var bufferedStream = new BufferedStream(gzipStream)) // Ещё один декоратор
{
    // Работаем с потоком, как обычно, но он теперь сжат и буферизирован
    bufferedStream.Write(...);
}
```

ASP.NET Core Middleware
Каждый middleware — это декоратор для HTTP-конвейера:
app.UseHttpsRedirection(); // Декоратор, добавляющий HTTPS
app.UseStaticFiles();      // Декоратор для статических файлов
app.UseAuthorization();    // Декоратор для авторизации
