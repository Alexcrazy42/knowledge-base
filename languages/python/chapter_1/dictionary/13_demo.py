products = {
    'Апельсины': 15, 
    'Сыр': 20, 
    'Мёд': 5
}

oranges_count = products['Апельсины']
print(oranges_count)

products['Шампиньоны'] = 13
print(products['Шампиньоны'])

products['Мёд'] = 20
products['Сыр'] -= 4
print(products)

products.pop('Сыр')

index = 1
for product in products:
    print(f'{index}. {product} = {products[product]}')
    index += 1