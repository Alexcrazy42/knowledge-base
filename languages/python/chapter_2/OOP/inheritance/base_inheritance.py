class Animal:
    def eat(self):
        print("Я могу есть!")

    def sleep(self):
        print("Я могу спать")

    def say(self):
        print("Я могу говорить")

class Goat(Animal):
    def eat(self):
        print("Козел может есть траву!")

    def say(self):
        print("Бееее!")

class Dog(Animal):
    def eat(self):
        print("Я ем только то, что мне дает хозяин")

    def say(self):
        print("Гав")

    def guard(self):
        print("Я могу охранять дом")

goat_1 = Goat()
goat_1.sleep()
goat_1.eat()
goat_1.say()

dog_1 = Dog()
dog_1.eat()
dog_1.say()
dog_1.guard()