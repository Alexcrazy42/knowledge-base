from random import randint

class Frog:
    count = 0
    already_catch_fly = False
    last_sound = ''

    def make_sound(self):
        sounds = ['Ква', 'Фьуу', '*писк*']
        sound = sounds[randint(0, 2)]
        print(sound)
        self.last_sound = sound
        return sound

    def catch_fly(self):
        if(self.last_sound == 'Ква' and not self.already_catch_fly):
            self.count += 1
            self.already_catch_fly = True
            print("Лягушка поймала муху")
        else:
            print("Лягушке не удалось поймать муху!")
        


frog = Frog()

while True:
    command = input("Введите команду: ")
    if(command == '1'):
        frog.make_sound()
    elif(command == '2'):
        frog.catch_fly()
    elif(command == '0'):
        print(f"Количество пойманных мух: {frog.count}")