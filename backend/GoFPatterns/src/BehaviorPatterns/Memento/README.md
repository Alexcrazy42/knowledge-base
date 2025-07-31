# Хранитель

Решаемые проблемы:
сохранение и восстановление состояния в объекте без нарушения инкапсуляции
откат изменений
снимки состояния для аудита или истории изменений

## Применение
графические редакторы (Photoshop, Figma)
Транзакции в БД (откат к предыдущему состоянию)
игры (сохранение/загрузка прогресса)

## библиотеки .net:

Windows Forms / WPF (Undo-Stack)
Встроенные механизмы отмены/повтора (Undo/Redo) в UI-элементах (например, TextBox).
Состояние контролов сохраняется и восстанавливается по аналогии с Memento.

```csharp
// WPF TextBox с поддержкой Undo
textBox.Text = "Hello";
textBox.Undo(); // Возврат к предыдущему состоянию
```
Как это связано с Memento:
— Внутри TextBox использует стек состояний (аналог Caretaker), где каждое состояние — это
снимок текста (аналог Memento).

Entity Framework Core (Change Tracking)
Механизм отслеживания изменений (Change Tracker) сохраняет исходные значения сущностей.
Позволяет откатить изменения (DbContext.ChangeTracker.Entries()).

```csharp
var book = dbContext.Books.First();
book.Title = "New Title";

// Получаем "снимок" исходного состояния (аналог Memento)
var originalValues = dbContext.Entry(book).OriginalValues.Clone();

// Откат к исходному состоянию
dbContext.Entry(book).CurrentValues.SetValues(originalValues);
```
Связь с Memento:
— OriginalValues — это "хранитель" состояния сущности.
— ChangeTracker — аналог Caretaker.

