using System.Reflection;

namespace Samples;

public class MethodInfoSamples
{
    public static void Sample1()
    {
        MethodInfo method = typeof(Foo).GetMethod("Print");
        
        var instance = Activator.CreateInstance(typeof(Foo));
        
        object result = method.Invoke(instance, new object[] { "test" }); // null тк ничего не возвращает

        MethodInfo method1 = typeof(JobActivatorSample).GetMethod("Sample");

        method1.Invoke(null, null);
        
        
    }

    public static void Sample2()
    {
        var method2 = typeof(MethodInfoSamples).GetMethod("Sample1");
        
        method2.Invoke(null, null);
    }
}