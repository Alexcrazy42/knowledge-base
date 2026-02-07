namespace Self.Patterns.Dispatcing;

public class Calculator
{
    public int Add(int a, int b) => a + b;
    public double Add(double a, double b) => a + b; // Перегрузка
}

public static class CalculatorTest
{
    public static void Test()
    {
        var calc = new Calculator();
        calc.Add(5, 10);      // Компилятор СРАЗУ знает: вызвать int версию
        calc.Add(5.5, 10.2);  // Компилятор СРАЗУ знает: вызвать double версию
    }
}
