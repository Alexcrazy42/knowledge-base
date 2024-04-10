from random import randint

with open('files/random_10.txt', 'w') as file:
    for i in range(10):
        file.write(f'{randint(0, 100)}, ')