class MagicOilCan:
    oil_count = None
    payment_plus_oil = 15
    plus_oil = 50
    notifier = None

    def __init__(self, notifier):
        self.oil_count = 300
        self.notifier = notifier

    def plus_oil(self, wood_cutter):
        if wood_cutter.pay_wood(self.payment_plus_oil):
            self.oil_count += 50
            return True
        else:
            self.notifier.notify("У вас недостаточно средств!")
            return False

    def minus_oil(self, oil):
        if oil > self.oil_count:
            oil_can_give = self.oil_count
            self.oil_count = 0
            return oil_can_give
        else:
            self.oil_count -= oil
            return oil
            
