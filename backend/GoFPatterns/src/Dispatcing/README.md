# Dispatching

Диспетчеризация - процесс, когда программа выбирает, какой метод вызвать

Два типа диспетчеризации:
1. Статическая диспетчеризация (compile-time)

Компилятор заранее знает, какой метод вызвать:

```csharp
public class Calculator
{
    public int Add(int a, int b) => a + b;
    public double Add(double a, double b) => a + b; // Перегрузка
}

var calc = new Calculator();
calc.Add(5, 10);      // Компилятор СРАЗУ знает: вызвать int версию
calc.Add(5.5, 10.2);  // Компилятор СРАЗУ знает: вызвать double версию
```

2. Динамическая диспетчеризация

Программа во время выполнения решает, какой метод вызвать. Это медленнее тк нужно искать метод в vtable (таблица виртуальных методов)

```csharp
public class Animal
{
    public virtual void MakeSound() => Console.WriteLine("Some sound");
}

public class Dog : Animal
{
    public override void MakeSound() => Console.WriteLine("Woof!");
}

public class Cat : Animal
{
    public override void MakeSound() => Console.WriteLine("Meow!");
}

// Во время компиляции неизвестно, какой метод вызовется!
Animal myPet = GetRandomPet(); // Может быть Dog или Cat
myPet.MakeSound(); // Решение принимается ТОЛЬКО во время выполнения
```

## Двойная диспетчеризация

Проблема: C# поддерживает только одинарную динамическую диспетчеризацию — выбор метода зависит только от типа объекта, на котором вызван метод.

Пример проблемы
```csharp
public class Weapon { }
public class Sword : Weapon { }
public class Bow : Weapon { }

public class Enemy { }
public class Orc : Enemy { }
public class Dragon : Enemy { }

// Хотим: разный урон в зависимости от ОБОИХ типов (оружие + враг)
public void Attack(Weapon weapon, Enemy enemy)
{
    // Как понять, что это Sword + Orc или Bow + Dragon?
    // С обычным полиморфизмом не получится!
}
```

Решение: Visitor Pattern (двойная диспетчеризация)

```csharp
// 1. Интерфейс посетителя
public interface IWeaponVisitor
{
    void Visit(Orc orc);
    void Visit(Dragon dragon);
}

// 2. Враги принимают посетителя
public abstract class Enemy
{
    public abstract void Accept(IWeaponVisitor visitor);
}

public class Orc : Enemy
{
    public override void Accept(IWeaponVisitor visitor)
    {
        visitor.Visit(this); // ПЕРВАЯ диспетчеризация: по типу Orc
    }
}

public class Dragon : Enemy
{
    public override void Accept(IWeaponVisitor visitor)
    {
        visitor.Visit(this); // ПЕРВАЯ диспетчеризация: по типу Dragon
    }
}

// 3. Оружие реализует посетителя
public class Sword : IWeaponVisitor
{
    public void Visit(Orc orc)
    {
        Console.WriteLine("Sword hits Orc for 10 damage"); // ВТОРАЯ диспетчеризация
    }

    public void Visit(Dragon dragon)
    {
        Console.WriteLine("Sword hits Dragon for 5 damage"); // ВТОРАЯ диспетчеризация
    }
}

public class Bow : IWeaponVisitor
{
    public void Visit(Orc orc)
    {
        Console.WriteLine("Bow hits Orc for 7 damage");
    }

    public void Visit(Dragon dragon)
    {
        Console.WriteLine("Bow hits Dragon for 15 damage"); // Дракон слаб к стрелам!
    }
}

// Использование
Enemy enemy = new Dragon();
IWeaponVisitor weapon = new Bow();

enemy.Accept(weapon);
// Output: "Bow hits Dragon for 15 damage"
```

Как это работает:

```csharp
1. enemy.Accept(weapon)
   ↓ ПЕРВАЯ диспетчеризация по типу enemy (Dragon)

2. Dragon.Accept() вызывает weapon.Visit(this)
   ↓ ВТОРАЯ диспетчеризация по типу weapon (Bow)

3. Вызывается Bow.Visit(Dragon dragon)
   ✅ Правильный метод найден!
```


### Зачем это нужно

Обычная диспетчеризация (одинарная)

```csharp
// Выбор зависит ТОЛЬКО от типа animal
Animal animal = new Dog();
animal.MakeSound(); // Вызовется Dog.MakeSound()
```

Двойная диспетчеризация
```csharp
// Выбор зависит от ДВУХ типов: enemy И weapon
Enemy enemy = new Dragon();
Weapon weapon = new Bow();
// Нужно вызвать метод специально для (Bow + Dragon)
```

### Реальные примеры использования

1. Обработка AST (Abstract Syntax Tree) в компиляторах

```csharp
// Разные операции (Print, Optimize) на разных узлах (NumberNode, StringNode)
node.Accept(new PrintVisitor());
node.Accept(new OptimizeVisitor());
```

2. Экспорт документов в разные форматы

```csharp
// Разные форматы (PDF, HTML) для разных элементов (Table, Image, Text)
document.Accept(new PdfExporter());
document.Accept(new HtmlExporter());
```

