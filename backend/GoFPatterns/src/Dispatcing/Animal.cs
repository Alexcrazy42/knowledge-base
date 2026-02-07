using System.Reflection;

namespace Self.Patterns.Dispatcing;

public class Animal
{
    public virtual void MakeSound() => Console.WriteLine("Some sound");

    public void Test() => Console.WriteLine("Test");
}

public class Dog : Animal
{
    public override void MakeSound() => Console.WriteLine("Woof!");

    public string GetName() => "Dog!";
}

public class Cat : Animal
{
    public override void MakeSound() => Console.WriteLine("Meow!");

    public string GetName() => "Cat!";
}

public static class AnimalTest
{
    public static void Test()
    {
        // Во время компиляции неизвестно, какой метод вызовется!
        Animal myPet = GetRandomPet(); // Может быть Dog или Cat
        myPet.MakeSound(); // Решение принимается ТОЛЬКО во время выполнения
    }


    public static Animal GetRandomPet()
    {
        var random = new Random();

        // Находим все типы, унаследованные от Animal
        var animalTypes = Assembly.GetExecutingAssembly()
            .GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && t.IsSubclassOf(typeof(Animal)))
            .ToList();

        // Выбираем случайный тип
        var randomType = animalTypes[random.Next(animalTypes.Count)];

        // Создаём экземпляр через рефлексию
        return (Animal)Activator.CreateInstance(randomType)!;
    }
}
