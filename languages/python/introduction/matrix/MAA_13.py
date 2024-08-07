def info():
    return ['Мамедов Александр Асифович', 13]

def to_encrypt(string: str, key: int) -> str:
    string = string.upper()
    string = string.replace(" ", "")
    mas = [[]]
    key1 = 0
    column = 0
    i = 0
    while i < len(string):
        if(key1 < key):
            mas[column].append(string[i])
            i += 1
            key1 += 1
        else:
            key1 = 0
            mas = [[]] + mas

    for i in range(len(mas)):
        if i % 2 == 1:
            mas[-(i+1)].reverse()
        
    if len(mas) % 2 == 0:
        for i in range(key - len(mas[column])):
            mas[column] = [" "] + mas[column]
    else:
        for i in range(key - len(mas[column])):
            mas[column].append(" ")


    res = ""
    i = 0
    j = len(mas[0])-1
    while j >= 0:
        for i in range(len(mas)):
            res += mas[i][j]
        j -= 1
    return res.replace(" ", "")

def reverse_column(matrix, column):
    row = len(matrix)
    for i in range(int(row / 2)):
        temp = matrix[row-i-1][column]
        matrix[row-i-1][column] = matrix[i][column]
        matrix[i][column] = temp


def to_decrypt(string: str, key: int) -> str:
    column = int(len(string) / key) if len(string) % key == 0 else int(len(string) / key) + 1    
    matrix = [[" " for i in range(column)] for i in range(key)]
    
    skip = column * key - len(string)

    # fill matrix
    if column % 2 == 1:
        cur_index = 0
        complete_row_count = key - skip
        incomplete_row_count = key - complete_row_count
        complete_row_start = incomplete_row_count
        for i in range(incomplete_row_count):
            for j in range(column - 1):
                matrix[i][j+1] = string[cur_index]
                cur_index += 1

        for j in range(key - complete_row_start):
            for k in range(column):
                matrix[complete_row_start + j][k] = string[cur_index]
                cur_index += 1
    else:
        cur_index = 0
        complete_row_count = key - skip
        imcomplete_row_count = skip
        incomplete_row_start_index = complete_row_count
        for i in range(complete_row_count):
            for j in range(column):
                matrix[i][j] = string[cur_index]
                cur_index += 1

        for j in range(imcomplete_row_count):
            for k in range(column-1):
                matrix[incomplete_row_start_index + j][k+1] = string[cur_index]
                cur_index += 1

            

    # make res
    res = ""
    for i in range(len(matrix[0])):
        if i % 2 == 1:
            reverse_column(matrix, -(i+1))

    for j in range(column):
        for i in range(key):
            res += matrix[i][j]
    
    res = res.replace(" ", "")
    return res[::-1]

key = 4
string = "ёлочная игрушка"
encrypt_string = to_encrypt(string, key)
print(encrypt_string)
print(to_decrypt(encrypt_string, key))