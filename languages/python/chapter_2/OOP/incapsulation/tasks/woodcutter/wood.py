class Wood:
    name = ''
    count_to_kill = 0
    hits_to_fall = 0
    oil_consumption = 0
    reward = 0

    def __init__(self, name, count_to_kill, oil_consumption, reward) -> None:
        self.name = name
        self.count_to_kill = count_to_kill
        self.hits_to_fall = count_to_kill
        self.oil_consumption = oil_consumption
        self.reward = reward