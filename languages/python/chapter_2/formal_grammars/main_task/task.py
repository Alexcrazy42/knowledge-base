class FSA:
    def __init__(self):
        self.transition_table = [
            [1, 1, 2, 2, 1],
            [1, 1, 1, 1, 1],
            [1, 3, 2, 2, 1],
            [1, 1, 4, 5, 1],
            [6, 1, 4, 5, 0],
            [6, 1, 5, 5, 0],
            [1, 1, 4, 5, 1]
        ]

        self.state = 0
        self.wrong_state = 1
        self.right_states = [0, 4, 5]
 
    def is_right(self, input_text: str) -> bool:
        self.state = 0
        input_text = input_text.replace(" ", "")
        k = 0
        do = True
        while k < len(input_text) and do:
            letter = input_text[k]
            letter_index = self.get_letter_index(letter)
            if letter_index == -1:
                self.state = self.wrong_state
            self.state = self.transition_table[self.state][letter_index]
            if self.state == self.wrong_state:
                do = False
            
            k += 1
        if self.state in self.right_states:
            return True
        else:
            return False
        
    def get_letter_index(self, letter: str) -> int:
        math_symbols = "+-*/"
        numbers = "0123456789"
        possible_sumbols_to_start_variable = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_"
        if letter in math_symbols:
            return 0
        elif letter == "=":
            return 1
        elif letter in numbers:
            return 2
        elif letter in possible_sumbols_to_start_variable:
            return 3
        elif letter == ";":
            return 4
        else:
            return -1



    def give_answer(self, input_text: str) -> None:
        if self.is_right(input_text) is True:
            print("Входная строчка верна!")
        else:
            print(f"Входная строка неверна!")


do = True
Machine = FSA()
while do == True:
    input_text = input("Введите строку: ")
    Machine.give_answer(input_text)