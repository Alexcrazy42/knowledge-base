namespace Samples;

public class TaskThreadSamples
{
    public static void Sample1()
    {
        var thread = new Thread(() =>
        {
            var count = 1;
            while (count < 100)
            {
                Console.WriteLine($"Работаю в потоке {Environment.CurrentManagedThreadId}, count = {count}");
                Thread.Sleep(1);
                count += 1;
            }
        });
        thread.Start();
        thread.Join(); // ждём завершения
    }

    public static void Sample2()
    {
        var done = new ManualResetEventSlim(false);

        ThreadPool.QueueUserWorkItem(_ =>
        {
            try
            {
                var count = 1;
                while (count < 100)
                {
                    Console.WriteLine($"Работаю в потоке {Environment.CurrentManagedThreadId}, count = {count}");
                    Thread.Sleep(1);
                    count += 1;
                }
            }
            finally
            {
                done.Set(); // ← сигналим, что работа закончена
            }
        });

        done.Wait(); // ← блокируем Main, пока работа не завершится
    }

    public static async Task Sample3()
    {
        var task = Task.Run(async () =>
        {
            var count = 1;
            while (count < 100)
            {
                // поток может  меняться, тк await Task.Delay возвращает управление пулу потоков, и после каждой 
                // задержки продолжение (MoveNext state machine) может выполниться на любой свободном потоке из пула
                // пул не гарантирует что это будет тот же самый поток
                Console.WriteLine($"Работаю в потоке {Environment.CurrentManagedThreadId}, count = {count}");
                await Task.Delay(10);
                count += 1;
            }

            return 5;
        });

        Console.WriteLine($"Сразу после запуска: {task.Status}"); // WaitingForActivation
        await Task.Delay(100);
        Console.WriteLine($"Через 100 мс: {task.Status}");         // Running или WaitingForActivation
        
        var result = await task;
        Console.WriteLine($"После await: {task.Status}, результат {result}"); // RanToCompletion
    }
}