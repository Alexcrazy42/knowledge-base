using Self.Patterns.BehaviorPatterns.ChainOfResponsibility;
using Self.Patterns.BehaviorPatterns.Command;
using Self.Patterns.BehaviorPatterns.Interpreter.Arithmetic;
using Self.Patterns.BehaviorPatterns.Interpreter.Sql;
using Self.Patterns.BehaviorPatterns.Iterator;

namespace Self.Patterns.BehaviorPatterns;

public class CommonClient
{
    public static void UseChainOfResponsibility()
    {
        var dialog = new PrintDialog();
        var button = new PrintButton(dialog);

        // Клиент отправляет запросы
        button.HandleHelp("PrintButtonHelp"); // Обработает кнопка
        button.HandleHelp("PrintDialogHelp"); // Обработает диалог
        button.HandleHelp("UnknownHelp");    // Никто не обработает
    }

    public static void UseCommand()
    {
        var doc = new Document();
        var app = new Application();

        // Команды
        var pasteCmd = new PasteCommand(doc);
        var openCmd = new OpenCommand(app);

        // Инициаторы (кнопки меню)
        var pasteMenuItem = new MenuItem();
        pasteMenuItem.SetCommand(pasteCmd);

        var openMenuItem = new MenuItem();
        openMenuItem.SetCommand(openCmd);

        // Пользователь нажимает кнопки
        openMenuItem.Click();  // Открывает документ
        pasteMenuItem.Click(); // Вставляет текст

        // Отмена
        pasteCmd.Undo(); // Удаляет вставленный текст

        Console.WriteLine(doc.Text);
    }

    public static void UseInterpreterSql()
    {
        var context = new SqlContext();
        var whereClause = new WhereClause();

        // Добавляем условия
        whereClause.AddCondition(new ColumnExpression("Name", "Alice"));
        whereClause.AddCondition(new ColumnExpression("Age", "25"));

        // Интерпретируем
        whereClause.Interpret(context);

        Console.WriteLine($"SELECT * FROM Users {context.Query}");
    }

    public static void UseInterpreterMath()
    {
        // (5 + 10) * 2
        var expr = new MultiplyExpression(
            new AddExpression(
                new NumberExpression(5),
                new NumberExpression(10)
            ),
            new NumberExpression(2)
        );

        Console.WriteLine(expr.Interpret()); // 30
    }

    public static void UseIterator()
    {
        var collection = new BookCollection();
        collection.Add(new Book { Title = "Война и мир", Author = "Толстой" });
        collection.Add(new Book { Title = "1984", Author = "Оруэлл" });

        var iterator = collection.CreateIterator();
        while (iterator.MoveNext())
        {
            var book = iterator.Current;
            Console.WriteLine($"{book.Title} — {book.Author}");
        }
    }
}
