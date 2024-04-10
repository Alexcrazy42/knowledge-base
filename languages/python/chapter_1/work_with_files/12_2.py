with open('files/products_names.txt', 'r', encoding='utf-8') as file:
    num = 1
    for line in file.readlines():
        print(f'{num}. {line[0:len(line)-1]};')
        num += 1