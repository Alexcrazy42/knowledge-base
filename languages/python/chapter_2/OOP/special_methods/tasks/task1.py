class Box:
    def __init__(self, new_oranges = 0):
        self.oranges = new_oranges

    def show_data(self):
        print(f"Апельсинов: {self.oranges}")

boxes = []
for i in range(10):
    cur_box = Box(i+1)
    boxes.append(cur_box)
    cur_box.show_data()