namespace Self.Patterns.Dispatcing;

public interface IWeaponVisitor
{
    void Visit(Orc orc);
    void Visit(Dragon dragon);
}

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

public static class WeaponTest
{
    public static void Test()
    {
        Enemy enemy = new Dragon();
        IWeaponVisitor weapon = new Bow();

        enemy.Accept(weapon);
    }
}
