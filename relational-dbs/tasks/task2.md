# Нормализация бд
1НФ - каждая таблица имеет свой pk, и все столбцы таблицы содержат атомарные значения
2НФ - все неключевые столбцы зависели от первичного ключа. не должно быть частичных функциональных зависимостей между неключевыми столбцами и первичными ключами
3НФ - все неключевые столбцы не зависели транзитивно от других неключевых столбцов.

функциональная зависимость - отношения между двумя столбцами, при котором значение одного столбца однозначно определяет значение другого столбца.

# Таблицы
orders:
number
date
client_code

order_items:
id
order_id
item_id
count

items:
id
name
price

clients:
code
name
address

# SQL
```
CREATE TABLE IF NOT EXISTS clients (
	code BIGSERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	address TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
	id BIGSERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	price SERIAL NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
	id BIGSERIAL PRIMARY KEY,
	item_id BIGSERIAL NOT NULL,
	count SERIAL NOT NULL,
    order_num BIGSERIAL NOT NULL,

    CONSTRAINT fk_orders
        FOREIGN KEY (order_num)
            REFERENCES orders(number);
	
	CONSTRAINT fk_items
		FOREIGN KEY (item_id)
			REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS orders (
	number BIGSERIAL PRIMARY KEY, 
	date TIMESTAMP NOT NULL,
	client_code BIGSERIAL NOT NULL
	
	CONSTRAINT fk_clients
		FOREIGN KEY (client_code)
			REFERENCES clients(code)
);
```

Функциональные зависимости:
clients: name, address -> code
items: name, price -> id
order_items: item_id, count -> id
orders: date, client_code -> number