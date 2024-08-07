class FSA:
    def __init__(self):
        self.alphabet = 'abcdef01234;'
        """
        Таблица содержит информацию о переходах между состояниями
        конечного автомата в зависимости от текущего символа во 
        входной последовательности

        0 - начальное состояние
        1 - первая буква
        2 - остальные буквы
        3 - ошибка
        4 - конец
        """
        self.transition_table = [
            #a, b, c, d, e, f, 0, 1, 2, 3, 4, ;
            [1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3], # 0
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0], # 1
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0], # 2
            [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], # 3
        ]

        self.error_table = [
            ["", "", "", "", "", "Начальная буква не может быть f", "Начальная буква не может быть 0", "Начальная буква не может быть 1", "Начальная буква не может быть 2", "Начальная буква не может быть 3", "Начальная буква не может быть 4", "Начальная буква не может быть ;"],
            ["", "", "", "", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", "", "", "", ""]
        ]

        self.state = 0
        self.wrong_state = 3
        self.wrong_state_message = ""

        # имеется несколько состояний, когда цепочка верная
        # это п.б. и о.б., т.е. 1 и 2
        self.right_state_list = [1, 2]

    def is_right(self, input_text: str) -> bool:
        """
        Определения принадлежности входной цепочки
        input_text: строка на проверку
        Возвращает истину или ложь
        """
        self.state = 0

        k = 0
        do = True
        while k < len(input_text) and do:
            word = input_text[k]
            if word in self.alphabet:
                word_index = self.alphabet.index(word)
                prev_state = self.state
                self.state = self.transition_table[self.state][word_index]
                if self.state == self.wrong_state:
                    self.wrong_state_message = f"Ошибка на месте {k} - символ {input_text[k]}. Ошибка - {self.error_table[prev_state][word_index]}"
                    return False
            else:
                self.state = self.wrong_state
                self.wrong_state_message = f"Ошибка на месте {k}, символ {input_text[k]} нельзя применять!"
                return False
            k += 1
        if self.state in self.right_state_list:
            return True
        else:
            self.wrong_state_message = f"Ошибка на месте {k-1} - символ {input_text[k-1]}"
            return False
    
    def give_answer(self, input_text: str) -> None:
        if self.is_right(input_text) is True:
            print("Входная строчка верна!")
        else:
            print(f"Входная строка неверна!\n{self.wrong_state_message}")

class Error:
    pass

do = True
Machine = FSA()
while do == True:
    input_text = input("Введите строку: ")
    Machine.give_answer(input_text)