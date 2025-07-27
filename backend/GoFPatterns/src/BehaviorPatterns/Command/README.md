# Команда

Проблемы, которые решает:
разделение отправителя и исполнителя
поддержка отмены/повтора операций (undo/redo)
очереди и планирование операций
упрощение добавления новых операций


UI-действий (кнопки, меню).
Транзакций (банковские операции) Saga паттерн.
Очередей задач (фоновые процессы/брокеры).

## Где применяется в .NET:

WPF/UWP команды

```csharp
public class MyCommand : ICommand
{
    public bool CanExecute(object parameter) => true;
    public void Execute(object parameter) => Console.WriteLine("Команда выполнена");
    public event EventHandler CanExecuteChanged;
}
```


ASP.NET Core — Middleware
Каждый middleware — это команда в цепочке.

Отмена операций
```csharp
var cancellationTokenSource = new CancellationTokenSource();
var command = new CancelableCommand(cancellationTokenSource.Token);
```
