class Player:
    wood_cutter = None
    player_notifier = None
    search_now = True

    def __init__(self, wood_cutter, player_notifier):
        self.wood_cutter = wood_cutter
        self.player_notifier = player_notifier
        
    def print_commands(self):
        message = ""
        if self.search_now == True:
            message += "1 - поиск дерева;"
            
        else:
            message += "1 - срубить дерево"

        message += "\n2 - использовать масленку"
        message += "\n3 - пополнить масленку"
        message += "\n4 - статистика;"
        message += "\n5 - вернуться домой"
        self.player_notifier.notify(message)
        return ['1', '2', '3', '4', '5']
        
        

        
            

    def make_action(self):
        commands = self.print_commands()
        self.player_notifier.notify("Команда: ")
        command = input()
        if command not in commands:
            self.player_notifier.notify("Выбрана неверная команда")
        else:
            if command == '1':
                if self.search_now == True:
                    self.wood_cutter.search_tree()
                    self.search_now = False
                else:
                    result = self.wood_cutter.cut_tree()
                    if result == 1:
                        self.search_now = True
                    elif result == 2:
                        return False
                    

            elif command == '2':
                self.wood_cutter.use_oil_can()
            
            elif command == '3':
                self.wood_cutter.fill_oil_can()

            elif command == '4':
                self.wood_cutter.stat()
            
            elif command == '5':
                self.wood_cutter.end_work()
                return False
            
        return True

                

                
                
