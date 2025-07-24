# Адаптер

Структурный паттерн, который позволяет объектам с несовместимыми
интерфейсами работать вместе. Он оборачивает один из объектов, преобразуя
его интерфейс в понятный для другого объекта

Проблемы, которые решает:
Интеграция старого кода с новым - когда нужно использовать старый класс,
но его интерфейс не подходит под новый код

Работа со стороними библиотеками - если API библиотеки не соответствуют
ожидаемому интерфейсу

Унификация интерфейсов - когда несколько классов делают одно и то же, но по разному


Использование в библиотеках .NET:

IEnumerable и IEnumerator (Адаптер для циклов foreach)
Когда вы используете foreach, компилятор C# автоматически генерирует
код, который адаптирует IEnumerable к IEnumerator:

```csharp
List<int> numbers = new List<int> { 1, 2, 3 };

// foreach неявно использует адаптер:
foreach (var num in numbers) // => numbers.GetEnumerator()
{
    Console.WriteLine(num);
}
```
List<T> реализует IEnumerable<T>, но foreach работает с IEnumerator<T>.
Метод GetEnumerator() возвращает IEnumerator, который адаптирует
коллекцию для пошагового перебора.


Stream и StreamReader/StreamWriter (Адаптер для работы с текстом)

Классы StreamReader и StreamWriter адаптируют байтовые потоки (Stream)
к текстовым интерфейсам:

```csharp
using (var fileStream = File.OpenRead("test.txt"))
using (var streamReader = new StreamReader(fileStream)) // Адаптер Stream → TextReader
{
    string line = streamReader.ReadLine();
    Console.WriteLine(line);
}
```
Что здесь адаптируется?

FileStream работает с байтами (byte[]), а StreamReader адаптирует его
к чтению строк (string).



DataAdapter в ADO.NET (Адаптер между БД и DataSet)
В ADO.NET классы DbDataAdapter (например, SqlDataAdapter) адаптируют данные
из SQL-запросов в таблицы DataSet:

```csharp
var adapter = new SqlDataAdapter("SELECT * FROM Users", connection);
var dataSet = new DataSet();
adapter.Fill(dataSet); // Адаптер преобразует SQL-данные в DataTable
```

Что здесь адаптируется?
SqlDataAdapter служит мостом между IDbCommand (SQL-запрос)
и DataSet (табличное представление).



XmlReader/XmlWriter и XDocument (Адаптер для LINQ to XML)

Классы XmlReader и XmlWriter работают в режиме "потока", а XDocument
предоставляет удобное DOM-представление.
Можно использовать XDocument.Load(XmlReader) для адаптации

```csharp
using (var xmlReader = XmlReader.Create("data.xml"))
{
    var doc = XDocument.Load(xmlReader); // Адаптер XmlReader → XDocument
    Console.WriteLine(doc.Root);
}
```
Что здесь адаптируется?
XDocument адаптирует низкоуровневый XmlReader к удобному LINQ-интерфейсу.



IEnumerable<T> → IQueryable<T> (Адаптер в LINQ)
Когда вы вызываете .AsQueryable() на коллекции, создается адаптер,
который позволяет использовать LINQ to Objects как LINQ to Entities:

```csharp
List<int> numbers = new List<int> { 1, 2, 3 };
IQueryable<int> queryableNumbers = numbers.AsQueryable(); // Адаптер IEnumerable → IQueryable

var filtered = queryableNumbers.Where(x => x > 1).ToList();
```

Что здесь адаптируется?
AsQueryable() адаптирует IEnumerable к IQueryable, чтобы можно было
использовать единый синтаксис LINQ.
