using Self.Patterns.BehaviorPatterns.ChainOfResponsibility;
using Self.Patterns.BehaviorPatterns.Command;

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
}
