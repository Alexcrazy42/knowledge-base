import random

class Robot():
    def __init__(self, name) -> None:
        print(f"Инициализация робота с именем {name}")
        self._name = name

    @property
    def name(self):
        return self._name
    
    @property
    def cur_pos(self):
        return self._cur_pos
    
    def create_field(self, row, column):
        self._field = [[0] * column for i in range(row)]
        self._cur_pos = [0, 0]

    def show_field(self):
        for i in self._field:
            print(*i)

    def random_move(self):
        def can_move(direction: int) -> bool:
            if(direction < 0 or direction > 3):
                return False
            if direction == 0: # движение наверх
                if self._cur_pos[0] == 0:
                    return False
                return True
            elif direction == 1: # движение направо
                if self._cur_pos[1] == len(self._field[0])-1:
                    return False
                return True
            elif direction == 2: # движение вниз
                if self._cur_pos[0] == len(self._field)-1:
                    return False
                return True
            else: # движение налево
                if self._cur_pos[1] == 0:
                    return False
                return True
            

        move_flag = False
        while move_flag == False:
            direction = random.randint(0, 3)
            if can_move(direction):
                if direction == 0: # наверх
                    self._cur_pos[0] -= 1
                elif direction == 1: # направо
                    self._cur_pos[1] += 1
                elif direction == 2: # вниз
                    self._cur_pos[0] += 1
                else: # налево
                    self._cur_pos[1] -= 1
                move_flag = True

    def paint_sell(self):
        x = self._cur_pos[0]
        y = self._cur_pos[1]
        self._field[x][y] = 1

robot1 = Robot("Антон")
robot1.create_field(8, 8)
print("Поле до рандомной покраски:")
robot1.show_field()

for i in range(100):
    robot1.random_move()
    robot1.paint_sell()
print("Поле до рандомной покраски:")
robot1.show_field()