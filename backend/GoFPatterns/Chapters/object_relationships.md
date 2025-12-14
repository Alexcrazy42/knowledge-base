# Отношения между объектами

Наследование, композиция, аггрегация, ассоциация, зависимости, делегирование

1. Наследование "IS-A" (является)

```csharp
// Наследование - отношение "является"
class Vehicle {
    void move() { /* базовая реализация */ }
}

class Car extends Vehicle {  // Car IS-A Vehicle
    void move() {
        System.out.println("Еду по дороге");
    }
}

class Airplane extends Vehicle {  // Airplane IS-A Vehicle
    void move() {
        System.out.println("Лечу в небе");
    }
}
```

2. Композиция "HAS-A" (Содержит)

Компонент-контейнер
Часть-целое

```csharp
// Компонент
class Engine {
    void start() { /* реализация двигателя */ }
}

class Wheel {
    void rotate() { /* реализация колеса */ }
}

// Контейнер
class Car {
    // Композиция - Car HAS-A Engine и HAS-A Wheels
    private Engine engine;
    private List<Wheel> wheels;

    Car(Engine engine, List<Wheel> wheels) {
        this.engine = engine;
        this.wheels = wheels;
    }

    void move() {
        engine.start();
        for (Wheel wheel : wheels) {
            wheel.rotate();
        }
    }
}
```

При этом Engine и Wheel не могу существовать без Car. Но вообще то это очень субъективная вещь, тк сейчас в нашей системе у колеса не может быть своей BL, но завтра она появится и колесо будет
не только с машиной завязано

3. Аггрегация "HAS-A" (слабый вариант)

```csharp
class Department {
    private List<Employee> employees;  // Агрегация

    // Employee может существовать без Department
    void addEmployee(Employee employee) {
        employees.add(employee);
    }
}

class Employee {
    // Employee может работать без Department
}
```

Вот это пример эволюционного роста из композиции. Ранее работники были только в контексте отдела и создавались вместе с ним. Теперь работники это самостоятельная единица и имеют свой жизненный цикл

4. Ассоциация (Association) - "USES" (использует)

```csharp
class Professor {
    private List<Course> courses;  // Ассоциация

    void teach(Course course) {
        // Professor использует Course
    }
}

class Course {
    // Course может существовать без Professor
}
```

5. Зависимость (Dependency) - временное использование

```csharp
class ReportGenerator {
    // Зависимость - временное использование
    void generateReport(Data data) {
        // Использует Data только во время выполнения метода
    }
}
```

Только в одном месте в классе понадобилось

6. Делегирование (Delegation) - паттерн композиции

```csharp
interface Printer {
    void print(String document);
}

class LaserPrinter implements Printer {
    public void print(String document) {
        System.out.println("Лазерная печать: " + document);
    }
}

class PrinterController {
    private Printer printer;  // Делегирование

    PrinterController(Printer printer) {
        this.printer = printer;
    }

    void print(String document) {
        // Делегируем работу другому объекту
        printer.print(document);
    }
}
```

Основные принципы:
1. Предпочитайте композицию над наследованием
Композиция часто предпочтительнее наследования из-за большей гибкости, слабой связанности и возможности изменять поведение во время выполнения.
Дополнительным плюсом является то, что наследование нагружает

С точки зрения .NET:
В IL-коде хранится вся цепочка виртуальных вызовов иерархии наследования
Больше метаданных = больше памяти = медленнее JIT-компиляция

2. Наследование используем только если:
- это настоящее отношение "является"
- необходим полиморфизм
- поведение базового класса действительно общее

3. Используем композицию, когда:
- отношение "имеет" или "использует"
- нужна гибкость для изменения поведения
- избегание хрупких иерархий

```csharp
// Стратегия через композицию
interface PaymentStrategy {
    void pay(int amount);
}

class CreditCardPayment implements PaymentStrategy {
    public void pay(int amount) { /* оплата картой */ }
}

class PayPalPayment implements PaymentStrategy {
    public void pay(int amount) { /* оплата через PayPal */ }
}

class ShoppingCart {
    private PaymentStrategy payment;  // Композиция

    void setPayment(PaymentStrategy payment) {
        this.payment = payment;  // Можем менять стратегию
    }

    void checkout(int amount) {
        payment.pay(amount);
    }
}
```

Пример конечно надуманный, тк стратегию использовать имеет смысл только в том случае, если набор входных и выходных данных один:
- разные алгоритмы расчета скидок на основе покупателя
- разные способы доставки
- разные форматы экспорта (на входе одни данные, а на выходе - файл)

4. "Composition over Inheritance"

```csharp
// Вместо глубокой иерархии:
class Animal {}
class Mammal extends Animal {}
class Bird extends Animal {}
class FlyingBird extends Bird {}  // Хрупко!

// Лучше через композицию поведения:
interface Flyable {
    void fly();
}

interface Swimmable {
    void swim();
}

class Animal {
    private List<Behavior> behaviors;

    void addBehavior(Behavior behavior) {
        behaviors.add(behavior);
    }
}

class Penguin extends Animal {
    Penguin() {
        addBehavior(new SwimmableImpl());
        // Не может летать - не добавляем Flyable
    }
}
```



Хорошо, когда объекты на ходу получают изменения:
```csharp
// ОПРЕДЕЛЯЕМ ПОВЕДЕНИЯ КАК ИНТЕРФЕЙСЫ
public interface ISwimmable { void Swim(); }
public interface IFlyable { void Fly(); }
public interface IWalkable { void Walk(); }

// РЕАЛИЗАЦИИ ПОВЕДЕНИЙ
public class SwimmingBehavior : ISwimmable {
    public void Swim() => Console.WriteLine("Плывет по воде");
}

public class FlyingBehavior : IFlyable {
    public void Fly() => Console.WriteLine("Летит по воздуху");
}

public class WalkingBehavior : IWalkable {
    public void Walk() => Console.WriteLine("Идет по земле");
}

// БАЗОВЫЙ КЛАСС С ДЕЛЕГИРОВАНИЕМ
public class Animal {
    private readonly Dictionary<Type, object> behaviors = new Dictionary<Type, object>();

    protected void AddBehavior<T>(T behavior) where T : class {
        behaviors[typeof(T)] = behavior;
    }

    // ЯВНЫЕ МЕТОДЫ ДЛЯ КЛИЕНТСКОГО КОДА
    public void Swim() => GetBehavior<ISwimmable>()?.Swim();
    public void Fly() => GetBehavior<IFlyable>()?.Fly();
    public void Walk() => GetBehavior<IWalkable>()?.Walk();

    // ВСПОМОГАТЕЛЬНЫЙ МЕТОД
    private T GetBehavior<T>() where T : class {
        if (behaviors.TryGetValue(typeof(T), out var behavior)) {
            return behavior as T;
        }
        return null;
    }

    // ПРОВЕРКИ ВОЗМОЖНОСТЕЙ (для клиентского кода)
    public bool CanSwim => GetBehavior<ISwimmable>() != null;
    public bool CanFly => GetBehavior<IFlyable>() != null;
    public bool CanWalk => GetBehavior<IWalkable>() != null;
}
```
