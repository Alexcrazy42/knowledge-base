def check_length(word:str, show_messages = False) -> bool:
    result = len(word) > 3
    if show_messages:
        if result:
            print("- содержит более 3-х букв")
        else:
            print("- содержит менее 4-х букв")
    return result

def check_palindrome(word:str, show_messages = False) -> bool:
    result = word == word[::-1]
    if show_messages:
        if result:
            print("- является палиндромом")
        else:
            print("- не является переводом")
    return result

def get_iwords(word:str, words:list, show_messages = False) -> bool:
    result = word[::-1] in words
    if show_messages:
        if get_iwords(word, words):
            print("- встречается в списке в перевёрнутом виде")
        else:
            print("- не встречается в списке в перевёрнутом виде")
    return result

def get_tripped_letters(word:str, show_messages = False) -> list:
    splitted_word = []
    for char in word:
        splitted_word.append(char)
    i = 1
    while i < len(splitted_word):
        if splitted_word[i] ==    splitted_word[i - 1][0]:
            splitted_word[i - 1] += splitted_word[i]
            del splitted_word[i]
        else:
            i += 1
    repeated_letters = [part[0] for part in splitted_word if len(part) >= 3]
    if show_messages:
        if repeated_letters == []:
            print("- не имеет более 2-х букв подряд")
        else:
            rl_string = str(repeated_letters)[1:-1]
            print(f"- более 2-х раз повторяются буквы: {rl_string}")
    return splitted_word

words = ["вишня", "лес", "шалаш", "сел", "змееед"]
long_words = []
palindromes = []
iwords = []
trippled_words = []

for word in words:
    print(f"Разбираем слово - {word}")
    if check_length(word, True):
        long_words.append(word)
    if check_palindrome(word, True):
        palindromes.append(word)
    if get_iwords(word, words, True):
        iwords.append(word)
    trippled_words = get_tripped_letters(word, True)
    print()

print("Длинные слова:", *long_words)
print("Палиндромы:", *palindromes)
print("iwords:", *iwords)
