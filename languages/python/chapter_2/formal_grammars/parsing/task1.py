import random

def get_symbol():
    return random.choice(['a', 'b', 'c'])

def get_word(depth):
    if depth == 0:
        return get_symbol()
    random_depth = random.randint(0, depth-1)
    return get_word(random_depth) + get_symbol()

def get_sentense(s_depth, w_depth):
    if s_depth == 0:
        return get_word(w_depth)
    
    rand_s_depth = random.randint(0, s_depth-1)
    return get_word(w_depth) + ", " + get_sentense(rand_s_depth, w_depth)

print(get_sentense(10, 5))