class Map:
    def __init__(self, suite, rank):
        self.suite = suite
        self.rank = rank

    def show_data(self):
        message = "Карта:"
        message += f" {self.suite}"
        message += f" {self.rank}"
        print(message)

deck = []
suites = ["Буби", "Черви", "Пики", "Крести"]
ranks_after_numbers = ["Валет", "Дама", "Король", "Туз"]
for i in range(4):
    for j in range(9):
        suite = suites[i]
        rank =  6+j if j < 5 else ranks_after_numbers[j % 5]
        map = Map(suite, rank)
        deck.append(map)

for i in range(len(deck)):
    deck[i].show_data()