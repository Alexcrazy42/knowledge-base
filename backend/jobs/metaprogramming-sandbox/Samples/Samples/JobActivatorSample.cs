using System.Reflection;

namespace Samples;

public class Foo
{
    public void Print(string text)
    {
        Console.WriteLine(text);
    }
}

public class Bar
{
    private readonly string _text;
    
    public Bar(string text)
    {
        _text = text;
    }
    
    public void Print(string txt)
    {
        Console.WriteLine($"{_text}, {txt}");
    }
}

public class JobActivatorSample
{
    public static void Sample()
    {
        var obj = Activator.CreateInstance(typeof(Foo));

        var foo = obj as Foo;
        if (foo is null)
        {
            return;
        }
        
        foo.Print("Hello World!");
        
        var obj1 = Activator.CreateInstance<Foo>();
        obj1.Print("Hello World1!");
    }

    public static void Sample1()
    {
        var name = typeof(Bar).AssemblyQualifiedName;
        
        var type = Type.GetType("Samples.Bar");

        ConstructorInfo? ctor = type?.GetConstructor([typeof(string)]);

        if (ctor is null)
        {
            throw new Exception("Constructor is null");
        }
        
        object instance = ctor.Invoke(new object[] { "привет" });
        
        var printMethod = type.GetMethod("Print");
        
        printMethod?.Invoke(instance, new object[] { "hello from reflection" });
    }
}