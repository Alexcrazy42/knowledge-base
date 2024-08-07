import re

mail_file_name = 'files/mail_file.txt'
random_file_name = 'files/random_text.txt'

emails = []

def is_email(string: str) -> bool:
    pattern = "([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)"
    return re.fullmatch(pattern, string)

with open(random_file_name, 'r', encoding='utf-8') as file:
    for line in file.readlines():
        if is_email(line[0:len(line)-1]):
            emails.append(line)

with open(mail_file_name, 'w', encoding='utf-8') as file:
    for mail in emails:
        file.write(mail)




