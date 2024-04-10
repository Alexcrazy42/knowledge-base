from wood import Wood
from random import randint

class Forest:
    all_woods = [
            Wood("Молодая сосна", 1, 10, 2), 
            Wood("Ель", 2, 7.5, 3),
            Wood("Кедр", 3, 6, 4), 
            Wood("Яблоня", 3, 5, 9),
            Wood("Тополь", 4, 4, 5),
            Wood("Липа желаний", 5, 6, 15),
            Wood("Клен", 5, 7, 10),
            Wood("Щедрый дуб", 6, 8, 125),
        ]
    
    categories = {
        0.5: [0, 1, 2, 4],
        0.35: [3, 6],
        0.15: [5, 7]
    }
    
    woods_in_world = []

    def init_forest(self):
        print("hello, forecast!")
        
        wood_count = randint(5, 10)
        for i in range(wood_count):
            wood_index = randint(0, 3)
            self.woods_in_world.append(self.all_woods[wood_index])
        print(f"Создано {wood_count} деревьев!")

    def get_new_tree(self):
        # random_num = randint(0, 1)
        # cumulative_prob = 0
        # for prob, category in self.categories.items():
        #     cumulative_prob += prob

        #     if(random_num < cumulative_prob):
        #         category_count = len(category)
        #         random_index = randint(0, category_count-1)
        #         return random_index
        return randint(0, len(self.all_woods)-1)
            
    def delete_tree(self, random_index):
        self.all_woods.pop(random_index)