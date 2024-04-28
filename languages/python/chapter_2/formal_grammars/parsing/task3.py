from random import randint
import random

def get_num():
    return randint(0, 9)

def get_number(depth):
    num = 0
    for i in range(depth):
        num += get_num() * 10 ** depth
    return num

def get_letter():
    rand = randint(0, 25)
    upper = True if randint(0, 1) == 1 else False
    return chr(ord('A') + rand) if upper == True else chr(ord('a') + rand)

def get_ob(depth):
    if depth == 0:
        return get_letter()
    
    choice = randint(0, 3)
    rand_depth = randint(0, depth-1)
    if choice == 0:
        
        return get_letter() + get_ob(rand_depth)
    elif choice == 1:
        return f"{get_number(randint(1, 5))}{get_ob(rand_depth)}"
    elif choice == 2:
        return f"_{get_ob(rand_depth)}"
    else:
        return ""
    
def get_pb():
    return get_letter()

def get_variable_name():
    return get_pb() + get_ob(randint(1, 5))

def get_declaration():
    if randint(0, 1) == 0:
        return ""
    decl = "int "
    decl += get_variable_name() + "="
    decl += f"{get_number(randint(1, 5))}" if randint(0, 1) == 1 else get_variable_name()
    return decl

def get_logic():
    comparison = random.choice(["==", ">", "<", ">=", "<=", "!="])
    return get_variable_name() + comparison + (get_variable_name() if randint(0,1) == 0 else f"{get_number(randint(1, 3))}")

def get_change():
    if randint(0, 1) == 0:
        return ""
    
    change = random.choice(["++", "--"])
    return get_variable_name() + change

def get_cycle():
    return f"for ({get_declaration()}; {get_logic()}; {get_change()})"

print(get_cycle())