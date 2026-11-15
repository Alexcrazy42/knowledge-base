using System.Diagnostics;

namespace Samples;

public class OpenTelemetrySamples
{
    public static void Sample1()
    {
        // 1. Создаём "издателя"
        using var mySource = new ActivitySource("MyApp.Orders");

        // 2. Создаём и настраиваем "подписчика"
        using var listener = new ActivityListener
        {
            // Слушаем только наш источник
            ShouldListenTo = source => source.Name == "MyApp.Orders",
    
            // Для всех Activity из этого источника запрашиваем все данные
            Sample = (ref ActivityCreationOptions<ActivityContext> options) => 
                ActivitySamplingResult.AllDataAndRecorded,
    
            // Когда Activity запускается...
            ActivityStarted = activity => 
                Console.WriteLine($"-> Started: {activity.OperationName} (Id: {activity.Id})"),
    
            // ...и когда останавливается (завершается)
            ActivityStopped = activity =>
            {
                Console.WriteLine($"<- Stopped: {activity.OperationName} (Duration: {activity.Duration.TotalMilliseconds:F2}ms)");
                Console.WriteLine($"   Tags: {string.Join(", ", activity.TagObjects)}");
            }
        };

        // 3. Регистрируем слушателя глобально
        ActivitySource.AddActivityListener(listener);

        // 4. Теперь создание Activity будет работать!
        using var activity = mySource.StartActivity("ProcessOrder");
        activity?.SetTag("order.id", 123);
        activity?.SetTag("customer.tier", "gold");
        Thread.Sleep(50);
    }
}