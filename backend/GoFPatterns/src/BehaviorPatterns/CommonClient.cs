using Self.Patterns.BehaviorPatterns.ChainOfResponsibility;
using Self.Patterns.BehaviorPatterns.Command;
using Self.Patterns.BehaviorPatterns.Interpreter.Arithmetic;
using Self.Patterns.BehaviorPatterns.Interpreter.Sql;
using Self.Patterns.BehaviorPatterns.Iterator;
using Self.Patterns.BehaviorPatterns.Mediator;
using Self.Patterns.BehaviorPatterns.Memento;
using Self.Patterns.BehaviorPatterns.Observer;
using Self.Patterns.BehaviorPatterns.State;
using Self.Patterns.BehaviorPatterns.Strategy;
using Self.Patterns.BehaviorPatterns.TemplateMethod;
using Self.Patterns.BehaviorPatterns.Visitor;
using Application = Self.Patterns.BehaviorPatterns.Command.Application;

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

    public static void UseMediator()
    {

        var listBox = new ListBox();
        var entryField = new EntryField();
        var director = new FontDialogDirector(listBox, entryField);

        // Пользователь выбирает шрифт в списке
        listBox.SelectItem("Arial"); // Автоматически обновит поле ввода
        Console.WriteLine(entryField.Text); // "Arial"

        // Пользователь вводит текст в поле
        entryField.SetText("Times New Roman"); // Автоматически обновит список
        Console.WriteLine(listBox.SelectedItem); // "Times New Roman"
    }

    public static void UseMemento()
    {
        var canvas = new Canvas();
        var history = new History();

        // Рисуем и сохраняем состояния
        canvas.Draw("Circle");
        history.Save(canvas.SaveState()); // Сохраняем состояние 1
        canvas.Print(); // Canvas: [Circle]

        canvas.Draw("Square");
        history.Save(canvas.SaveState()); // Сохраняем состояние 2
        canvas.Print(); // Canvas: [Circle][Square]

        // Отменяем последнее действие
        canvas.RestoreState(history.Undo());
        canvas.Print(); // Canvas: [Circle]
    }

    public static void UseObserver()
    {
        var weatherStation = new WeatherStation();

        var mobileApp = new MobileApp();
        var smartHome = new SmartHome();

        // Подписываем наблюдателей
        weatherStation.Attach(mobileApp);
        weatherStation.Attach(smartHome);

        // Изменяем состояние (автоматически уведомляем всех)
        weatherStation.SetMeasurements(31, 60);

        // Отписываем один наблюдатель
        weatherStation.Detach(smartHome);

        weatherStation.SetMeasurements(28, 55);
    }

    public static void UseState()
    {
        var context = new Context(new ConcreteStateA());

        // Клиент работает только с контекстом, не зная о состояниях
        for (var i = 0; i < 5; i++)
        {
            context.Request();
        }
    }

    public static void UseStrategy()
    {
        var composition = new Composition(new SimpleCompositor());

        // Добавляем компоненты
        composition.AddComponent("Hello");
        composition.AddComponent("Strategy");
        composition.AddComponent("Pattern");

        // Используем текущую стратегию
        composition.Compose();

        // Меняем стратегию во время выполнения
        composition.SetCompositor(new TeXCompositor());
        composition.Compose();

        // Еще одна стратегия
        composition.SetCompositor(new ArrayCompositor());
        composition.Compose();
    }

    public static void UseTemplateMethod()
    {
        Console.WriteLine("Запуск MyApplication:");
        TemplateApplication app = new MyTemplateApplication();
        app.Run();

        Console.WriteLine("\nЗапуск AnotherApplication:");
        app = new AnotherTemplateApplication();
        app.Run();
    }

    public static void UseVisitor()
    {
        // Создаем AST (Abstract Syntax Tree) простой программы
        var program = new ProgramAst();
        program.AddNode(new AssignmentNode(
            "x",
            new ExpressionNode(
                new VariableRefNode("a"),
                new VariableRefNode("b")
            )
        ));

        // Применяем посетитель для проверки типов
        var typeChecker = new TypeCheckingVisitor();
        program.Accept(typeChecker);

        Console.WriteLine("Type checking completed");
    }
}
