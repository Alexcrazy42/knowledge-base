from forest import Forest
from woodcutter import WoodCutter
from notifier import Notifier
from player import Player
from magic_oil_can import MagicOilCan

forecast = Forest()
forecast.init_forest()

notifier = Notifier()

oil_can = MagicOilCan(notifier)

wood_cutter = WoodCutter(forecast, notifier, oil_can)
wood_cutter.main_word()

player = Player(wood_cutter, notifier)

do = True
while do:
    if player.make_action() == False:
        do = False