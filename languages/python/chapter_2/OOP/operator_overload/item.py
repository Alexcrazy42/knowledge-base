import queue

combinations = {
    ('трава', 'трава'): 'веревка',
    ('уголь', 'палка'): 'факел',
    ('большой камень', 'верёвка', 'палка'): 'топор',
    ('топор', 'дерево'): 'палка',
    ('острый камень', 'веревка', 'палка'): 'копье',
    ('палка', 'палка', 'факел'): 'костер',
    ('топор', 'дерево'): 'палка',
    ('курица', 'копье'): 'мясо',
    ('мясо', 'костер'): 'жареное мясо',
    ('вода', 'костер'): 'уголь',
    ('вода', 'костер', 'мясо'): 'тушеное мясо'
}

substractions = {
    ('веревка', 'разборщик'): 'трава',
    ('топор', 'разборщик'): 'палка',
    ('копье', 'разборщик'): 'палка',
    ('одежда', 'разборщик'): 'ткань',
    ('топор', 'верстак'): 'большой камень',
    ('копье', 'верстак'): 'острый камень',
}

class Item:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f'{self.name}'

    def __add__(self, other):
        pass

    def __sub__(self, other):
        if (self.name, other.name) in substractions:
            return Item(substractions[(self.name, other.name)])
        else:
            print("Такого рецепта не существует!")

do = True
while do == True:
    command = input("Искомый рецепт: ")
    splitted = command.split()
    if(splitted[0]) == '0':
        do = False
        print("Выход из справочника")
        continue
    
    if '+' in splitted and '-' in splitted:
        print("Такого рецепта не существует!")
        continue

    if '-' in splitted and len(splitted) > 3:
        print("Такого рецепта не существует!")
        continue

    if '+' in splitted:
        s = set()
        for item in splitted:
            if item != '+':
                s.add(item)

        found = False
        for i in substractions:
            if s == set(i):
                message = f"Рецепт даст игроку:\n{substractions[i]}"
                print(message)
                found = True
        
        if found == False:
            print("Такого рецепта не существует!")
            


    if '-' in splitted and splitted[1] == '-' and len(splitted) == 3:
        item1 = Item(splitted[0])
        item2 = Item(splitted[2])

        res = item1 - item2
        if res == None:
            print("Такого рецепта не существует!")
        else:
            message = f"Рецепт даст игроку:\n{res}"
            print(message)



