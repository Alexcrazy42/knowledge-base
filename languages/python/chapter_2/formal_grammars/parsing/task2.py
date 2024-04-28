import random

def get_day():
    choice = random.randint(0, 2)
    if choice == 0:
        return f"0{random.randint(1, 9)}"
    elif choice == 1:
        return f"{random.randint(1, 2)}{random.randint(0, 9)}"
    else:
        return f"3{random.randint(0, 1)}"
    
def get_month():
    choice = random.randint(0, 1)
    if choice == 0:
        return f"0{random.randint(1, 9)}"
    else:
        return f"1{random.randint(1, 2)}"
    
def get_year():
    year = random.randint(1, 9999)
    if year < 10:
        return f"000{year}"
    elif year < 100:
        return f"00{year}"
    elif year < 1000:
        return f"0{year}"
    else:
        return year
    
def get_date():
    return f"{get_day()}/{get_month()}/{get_year()}"

def get_sentense(depth):
    if depth == 0:
        return get_date()
    
    random_depth = random.randint(0, depth-1)
    return get_date() + "; " + get_sentense(random_depth)

print(get_sentense(5))