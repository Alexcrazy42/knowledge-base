from random import randint
from notifier import Notifier

class WoodCutter:
    wood_cutter_notifier = None
    forest = None
    oil = None
    total_oil_consumption = None
    overall_wood = None
    overall_wood_consumption = None
    trees_cutted = None
    current_selected_tree = None
    current_selected_tree_index = None
    oil_can = None

    def __init__(self, forest, wood_cutter_notifier, oil_can) -> None:
        self.wood_cutter_notifier = wood_cutter_notifier
        self.oil_can = oil_can
        self.oil = 100
        self.total_oil_consumption = 0
        self.forest = forest
        self.overall_wood = 0
        self.overall_wood_consumption = 0
        self.trees_cutted = 0
        self.current_selected_tree = 0
        self.current_selected_tree_count_hit = 0

    def pay_wood(self, wood_payment):
        if self.overall_wood >= wood_payment:
            self.overall_wood -= wood_payment
            self.overall_wood_consumption += wood_payment
            return True
        return False
        

    def main_word(self):
        self.wood_cutter_notifier.notify("Дровосек начинается работу в лесу")

    def search_tree(self):
        tree_index = self.forest.get_new_tree()
        self.current_selected_tree_index = tree_index
        self.current_selected_tree = self.forest.all_woods[tree_index]
        message = f"Дровосек находит дерево - {self.current_selected_tree.name}"
        self.wood_cutter_notifier.notify(message)


    def cut_tree(self):
        if self.current_selected_tree == None:
            self.wood_cutter_notifier.notify("Дерево не выбрано!")
        else:
            name = self.current_selected_tree.name
            total_count_to_kill = self.current_selected_tree.count_to_kill
            left_to_kill = self.current_selected_tree.hits_to_fall

            if(self.lower_oil(self.current_selected_tree.oil_consumption) == True):
                self.current_selected_tree.hits_to_fall -= 1
                left_to_kill = self.current_selected_tree.hits_to_fall
                if(left_to_kill == 0):
                    message = f"Дровосек делает удар по {name} ({total_count_to_kill}/{total_count_to_kill})!"
                    self.wood_cutter_notifier.notify(message)
                    
                    current_wood_prize_after_kill = self.current_selected_tree.reward
                    self.wood_cutter_notifier.notify(f"Дерево упало, дровосек получает {current_wood_prize_after_kill} доски!")
                    self.overall_wood += current_wood_prize_after_kill
                
                    self.forest.delete_tree(self.current_selected_tree_index)
                    self.current_selected_tree = None
                    self.current_selected_tree_index = None
                    self.trees_cutted += 1
                    return 1
                    
                else:
                    message = f"Дровосек делает удар по {name} ({total_count_to_kill - self.current_selected_tree.hits_to_fall}/{total_count_to_kill})!"
                    self.wood_cutter_notifier.notify(message)
            else:
                return 2

    def lower_oil(self, oil_count):
        self.oil -= oil_count
        
        if self.oil <= 0:
            self.oil = 0
            self.total_oil_consumption += self.oil
            self.wood_cutter_notifier.notify(f"Масло: ({self.oil}/100)")
            message = "О нет, масло закончилось!\n"
            message += "Дровосек заржавел, игра окончена!"
            
            self.wood_cutter_notifier.notify(message)
            self.stat()
            return False
        self.total_oil_consumption += oil_count
        self.wood_cutter_notifier.notify(f"Масло: ({self.oil}/100)")
        return True
    
    def use_oil_can(self):
        oil_want = 100 - self.oil

        oil_can_give = self.oil_can.minus_oil(oil_want)
        self.oil += oil_can_give
        message = "Дровосек достает масленку и смазывает себя"
        message += f"\nМасло дровосека ({self.oil}/100)"
        message += f"\nМасло в масленке ({self.oil_can.oil_count}/300)"
        self.wood_cutter_notifier.notify(message)

    def fill_oil_can(self):
        message = ""
        if self.oil_can.plus_oil(self):
            message += f"Дрососек тратит 15 дерева для пополнения масленки ({self.oil_can.oil_count}/300)"
            self.wood_cutter_notifier.notify(message)
        


    def stat(self):
        message = "Статистика:\n"
        message += f"Масло дровосека: {self.oil}/100\n"
        message += f"Масло масленки: {self.oil_can.oil_count}/300\n"
        message += f"Израсходовано всего масла: {self.total_oil_consumption}\n"
        message += f"Доски в инвентаре: {self.overall_wood}\n"
        message += f"Затрачено досок: {self.overall_wood_consumption}\n"
        message += f"Срублено деревьев: {self.trees_cutted}\n"
        self.wood_cutter_notifier.notify(message)

    def end_work(self):
        self.wood_cutter_notifier.notify("После тяжелого рабочего дня дровосек возвращается домой")
        self.stat()