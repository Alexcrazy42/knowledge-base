class Human:
    __name = None
    __sex = None
    __height = None
    __weight = None
    
    def __init__(self, name, sex, height, weight):
        self.__name = name
        self.__sex = sex
        self.__height = height
        self.__weight = weight

    def set_name(self, name):
        self.__name = name

    def get_name(self) -> str:
        return self.__name

    def set_sex(self, sex):
        self.__sex = sex

    def get_sex(self) -> str:
        return self.__sex

    def set_weight(self, weight):
        self.__weight = weight

    def get_weight(self) -> str:
        return self.__weight

    def set_heigth(self, height):
        self.__height = height

    def get_height(self) -> str:
        return self.__height

class Student(Human):
    __year_entered = None
    __graduate = None

    def __init__(self, name, sex, height, weight):
        super(Student, self).__init__(name, sex, height, weight)

    def set_year_entered(self, year)  -> None:
        self.__year_entered = year

    def get_year_entered(self) -> int:
        return self.__year_entered

    def set_graduate(self, graduate) -> None:
        self.__graduate = graduate

    def get_graduate(self) -> int:
        return self.__graduate

    def increase_year(self) -> None:
        self.__graduate -= 1
        if(self.__graduate == 0):
            print("Студент закончил обучение")



human = Human(None, None, None, None)
student = Student(None, None, None, None, None, ModuleNotFoundError)

action = True
while action:
    command = input()
    command_args = command.split(' ')
    if command_args[0] == "1":
        name = command_args[1]
        sex = command_args[2]
        height = int(command_args[3])
        weight = int(command_args[4])
        human = Human(name, sex, height, weight)
    elif command_args[0] == "2":
        name = command_args[1]
        human.set_name(name)
    elif command_args[0] == "3":
        name = command_args[1]
        sex = command_args[2]
        height = int(command_args[3])
        weight = int(command_args[4])
        student = Student(name, sex, height, weight, None, None)
    elif command_args[0] == "4":
        year_entered = int(command_args[1])
        graduate = int(command_args[2])
        student.set_year_entered(year_entered)
        student.set_graduate(graduate)
    elif command_args[0] == "5":
        name = command_args[1]
        student.set_name(name)
    elif command_args[0] == "6":
        student.increase_year()
    elif command_args[0] == "7":
        message = ""
        message += f"Имя: {human.get_name()}\n"
        message += f"Пол: {human.get_sex()}\n"
        message += f"Рост: {human.get_height()}\n"
        message += f"Вес: {human.get_weight()}\n"
        print(message)

    elif command_args[0] == "8":
        message = ""
        message += f"Имя: {student.get_name()}\n"
        message += f"Пол: {student.get_sex()}\n"
        message += f"Рост: {student.get_height()}\n"
        message += f"Вес: {student.get_weight()}\n"
        message += f"Год поступления: {student.get_year_entered()}"
        message += f"Лет обучаться: {student.get_graduate()}"
        print(message)
    elif command_args[0] == "0":
        action = False