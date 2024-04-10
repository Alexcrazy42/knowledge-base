import random

def load_data(filename):
    with open(filename, 'r', encoding='utf-8') as file:
        data = [line.split()[0] for line in file.read().splitlines()]
    return data

def generate_email(domains, words):
    mailboxname = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=random.randint(1, 20)))
    domain = random.choice(words) + random.choice(domains)
    return f"{mailboxname}@{domain}"

def generate_emails(num_emails, domains, words):
    emails = [generate_email(domains, words) for _ in range(num_emails)]
    return emails

def main():
    try:
        num_emails = int(input("Введите количество случайных email-адресов (от 1 до 10): "))
        if 1 <= num_emails <= 10:
            domains = load_data('files/domains_wiki.txt')
            words = load_data('files/dictionary_45000.txt')

            generated_emails = generate_emails(num_emails, domains, words)

            print(f"Случайно сгенерированные {num_emails} адресов:")
            for email in generated_emails:
                print(email)
        else:
            print("Пожалуйста, введите число от 1 до 10.")
    except ValueError:
        print("Некорректный ввод. Пожалуйста, введите число.")

if __name__ == "__main__":
    main()