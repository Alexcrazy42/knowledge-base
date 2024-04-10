# взаимодействие классов (разных классов)
class Box:
    oranges = 10

class Human:
    def eat_orange(self, fruit_box: Box):
        fruit_box.oranges -= 1


orange_box = Box()
eater = Human()
eater.eat_orange(orange_box)
print(orange_box.oranges)