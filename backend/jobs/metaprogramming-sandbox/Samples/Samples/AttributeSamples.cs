using System.Reflection;

namespace Samples;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class RetryAttribute : Attribute
{
    public int MaxAttempts { get; }
    public int DelayMs { get; init; }
    public Type[] RetryOn { get; init; } = [typeof(Exception)];

    public RetryAttribute(int maxAttempts) => MaxAttempts = maxAttempts;
}

public class Test1
{
    [Retry(2, DelayMs = 100, RetryOn = [typeof(InvalidCastException)])]
    public void Run()
    {
        throw new InvalidCastException("Ошибка");
    }
}

public class AttributeSamples
{
    public static void Sample1()
    {
        var instance = new Test1();
        
        Type? exceptionType = null;
        try
        {
            instance.Run();
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            exceptionType = e.GetType();
        }

        if (exceptionType is null)
        {
            return;
        }
        
        var method = instance.GetType().GetMethod(nameof(Test1.Run));
        var attr = method?.GetCustomAttribute<RetryAttribute>(inherit: true);

        if (attr is null)
        {
            return;
        }
        
        var retryAttempt = 0;
        
        var retriedExceptions = attr.RetryOn;

        if (retriedExceptions.All(x => x != exceptionType))
        {
            return;
        }
        
        while (retryAttempt < attr.MaxAttempts)
        {
            try
            {
                instance.Run();
                return;
            }
            catch (Exception e) when (retriedExceptions.Any(x => x == e.GetType()))
            {
                Console.WriteLine(e);
                retryAttempt++;
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return;
            }
        }
    }
}