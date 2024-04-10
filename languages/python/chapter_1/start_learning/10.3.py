translitDict = {
    "А": "A",
    "Б": "B",
    "В": "V",
    "Г": "G",
    "Д": "D",
    "Е": "E",
    "Ё": "Yo",
    "Ж": "Zh",
    "З": "Z",
    "И": "I",
    "Й": "I",
    "К": "K",
    "Л": "L",
    "М": "M",
    "Н": "N",
    "О": "O",
    "П": "P",
    "Р": "R",
    "С": "S",
    "Т": "T",
    "У": "U",
    "Ф": "F",
    "Х": "H",
    "Ч": "Ch",
    "Ц": "Ts",
    "Ш": "Sh",
    "Щ": "Sch",
    "Ъ": "",
    "Ы": "y",
    "Ь": "",
    "Э": "E",
    "Ю": "Yu",
    "Я": "Ya",
}

def to_translit(input_string):
    splitted_input = input_string.split(' ')
    res = ""
    for word in splitted_input:
        if(word == 'и'):
            res += translitDict[word.upper()].lower()
        else:
            for letter in word:
                if(letter.isdigit()):
                    res += letter
                elif(letter == '.'):
                    res += letter
                else:
                    res += translitDict[letter.upper()]
        res += ' '
    return res


        

def to_short(input_string):
    res = ""
    splitted = input_string.split(' ')
    for word in splitted:
        if(word.isalpha() == False):
            for i in word:
                if(i != '.'):
                    res += i
            res += "_"
                
        else:
            if word != '':
                res += word[0]

    return res[:len(res)-1]



name = input("Введите наименование направления:\n")
profile = input("Профиль направления:\n")
# name = "25.05.03 Техническая эксплуатация транспортного радиооборудования"
# profile = "Радиосвязь и электрорадионавигация морского флот"

print(to_short(to_translit(name)) + "_" + to_short(to_translit(profile)))

