namespace Self.Patterns.BehaviorPatterns.ChainOfResponsibility;

// Обработчик 1: Кнопка
public class PrintButton : HelpHandler
{
    public PrintButton(HelpHandler? successor = null) : base(successor) { }

    public override void HandleHelp(string request)
    {
        if (request == "PrintButtonHelp")
        {
            Console.WriteLine("Показана справка для кнопки печати");
        }
        else
        {
            base.HandleHelp(request); // Передаём дальше
        }
    }
}

// Обработчик 2: Диалог
public class PrintDialog : HelpHandler
{
    public PrintDialog(HelpHandler? successor = null) : base(successor) { }

    public override void HandleHelp(string request)
    {
        if (request == "PrintDialogHelp")
        {
            Console.WriteLine("Показана справка для диалога печати");
        }
        else
        {
            base.HandleHelp(request); // Передаём дальше
        }
    }
}
