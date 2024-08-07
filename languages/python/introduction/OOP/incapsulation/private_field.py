# приватные поля
import os
print(os.listdir())

class CashRegister:
    __selling_price = 500
    
    def change_price(self, new_price):
        self.__selling_price = new_price

    def sell_product(self):
        print(f'Покупка на сумму {self.__selling_price}')

cash_register = CashRegister()
cash_register.change_price(650)
cash_register.sell_product()

cash_register.__selling_price = 100
cash_register.sell_product()