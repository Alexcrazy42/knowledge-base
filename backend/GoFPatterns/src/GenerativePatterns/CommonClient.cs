using Self.Patterns.GenerativePatterns.AbstractFactory;
using Self.Patterns.GenerativePatterns.Builder;
using Self.Patterns.GenerativePatterns.FactoryMethod;
using Self.Patterns.GenerativePatterns.Prototype;
using Self.Patterns.GenerativePatterns.Singleton;

namespace Self.Patterns.GenerativePatterns;

public class CommonClient
{
    public static void UseAbstractFactory()
    {
        var modernFactory = new ModernFurnitureFactory();
        var modernClient = new Client(modernFactory);
        modernClient.UseFurniture();

        var classicFactory = new ClassicFurnitureFactory();
        var classicClient = new Client(classicFactory);
        classicClient.UseFurniture();
    }

    public static void UseBuilder()
    {
        // 1. Создаем строителя
        var gamingBuilder = new GamingComputerBuilder();

        // 2. Создаем распорядителя и передаем ему строителя
        var director = new ComputerDirector(gamingBuilder);

        // 3. Говорим распорядителю собрать компьютер
        director.BuildGamingComputer();

        // 4. Забираем готовый продукт
        var gamingComputer = gamingBuilder.GetComputer();
        gamingComputer.Display();

        // Пример сборки офисного компьютера
        var officeBuilder = new GamingComputerBuilder(); // Можно создать отдельный OfficeComputerBuilder
        director = new ComputerDirector(officeBuilder);
        director.BuildOfficeComputer();

        var officeComputer = officeBuilder.GetComputer();
        officeComputer.Display();
    }

    public static void UseFactoryMethod()
    {
        Application textApp = new TextEditor();
        textApp.NewDocument("Договор.txt");

        Console.WriteLine();

        // Создаем табличный редактор
        Application spreadsheetApp = new SpreadsheetApp();
        spreadsheetApp.NewDocument("Бюджет.xlsx");
    }

    public static void UsePrototype()
    {
        var wholeNote = new WholeNote();
        var editor = new NoteEditor(wholeNote);

        editor.CreateAndPlayNote(); // Играем Целая нота (4000 мс)
    }


    public static void UseSingleton()
    {
        var singleton = SingletonImpl.GetInstance();
        singleton = SingletonImpl.GetInstance();
        singleton = SingletonImpl.GetInstance();
        singleton.Log("Hello World");
    }
}
