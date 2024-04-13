class Vector:
    name = None

    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'{self.name}({self.x}, {self.y})'
    
    def __add__(self, other):
        x = self.x + other.x
        y = self.y + other.y
        return Vector(x, y)
    
    def __sub__(self, other):
        x = self.x - other.x
        y = self.y - other.y
        return Vector(x, y)
    
    def __mul__(self, number):
        x = self.x * number
        y = self.y * number
        return Vector(x, y)
    
    def __truediv__(self, number):
        x = self.x / number
        y = self.y / number
        return Vector(x, y)
    
dict = dict()

do = True
while do == True:
    command = input()
    command_splitted = command.split()
    if command_splitted[0] == '0':
        print("Действие программы закончено!")
        do = False
    elif command_splitted[0] == '1':
        if len(command_splitted) == 4:
            name = command_splitted[1]
            if command_splitted[2].isdigit() and command_splitted[3].isdigit():
                x = int(command_splitted[2])
                y = int(command_splitted[3])
                if name in dict:
                    print(f"Вектор с именем {name} уже есть!")
                else:
                    vector = Vector(x, y)
                    vector.name = name
                    dict[name] = vector
            else:
                print("Параметры должны быть числами!")
        else:
            print("Неправильная сигнатура команды!")
    elif command_splitted[1] == '+' and command_splitted[3] == '=':
        if len(command_splitted) == 5:
            name1 = command_splitted[0]
            name2 = command_splitted[2]
            res_name = command_splitted[4]

            if name1 not in dict:
                print(f"Не существует вектора {name1}")
                continue
            if name2 not in dict:
                print(f"Не существует вектора {name2}")
                continue
                
            vector = dict[name1] + dict[name2]
            vector.name = res_name
            print(f'{dict[name1]} + {dict[name2]} = {vector}')
            dict[res_name] = vector

    elif command_splitted[1] == '-' and command_splitted[3] == '=':
        if len(command_splitted) == 5:
            name1 = command_splitted[0]
            name2 = command_splitted[2]
            res_name = command_splitted[4]

            if name1 not in dict:
                print(f"Не существует вектора {name1}")
                continue
            if name2 not in dict:
                print(f"Не существует вектора {name2}")
                continue
                
            vector = dict[name1] - dict[name2]
            vector.name = res_name
            print(f'{dict[name1]} - {dict[name2]} = {vector}')
            dict[res_name] = vector

    elif command_splitted[1] == '*' and command_splitted[2].isdigit() and command_splitted[3] == '=':
        if len(command_splitted) == 5:
            name1 = command_splitted[0]
            scalar = int(command_splitted[2])
            res_name = command_splitted[4]

            if name1 not in dict:
                print(f"Не существует вектора {name1}")
                continue
                
            vector = dict[name1] * scalar
            vector.name = res_name
            print(f'{dict[name1]} * {scalar} = {vector}')
            dict[res_name] = vector

    elif command_splitted[1] == '/' and command_splitted[2].isdigit() and command_splitted[3] == '=':
        if len(command_splitted) == 5:
            name1 = command_splitted[0]
            scalar = int(command_splitted[2])
            res_name = command_splitted[4]

            if name1 not in dict:
                print(f"Не существует вектора {name1}")
                continue
            if name2 not in dict:
                print(f"Не существует вектора {name2}")
                continue
                
            vector = dict[name1] / scalar
            vector.name = res_name
            print(f'{dict[name1]} / {scalar} = {vector}')
            dict[res_name] = vector

    else:
        print("Неверная сигнатура команды!")