namespace Self.Patterns.GenerativePatterns.Builder;

public class Computer
{
    public string? Cpu { get; set; }
    public string? Gpu { get; set; }
    public int? Ram { get; set; } // в GB
    public int? Storage { get; set; } // в GB
    public bool HasSsd { get; set; }

    public void Display()
    {
        Console.WriteLine($"Компьютер с:");
        Console.WriteLine($"- Процессор: {Cpu}");
        Console.WriteLine($"- Видеокарта: {Gpu}");
        Console.WriteLine($"- Оперативная память: {Ram} GB");
        Console.WriteLine($"- Накопитель: {Storage} GB {(HasSsd ? "SSD" : "HDD")}");
    }
}
