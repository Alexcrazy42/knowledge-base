# version2

Доработал апи, добавил базу данных PostgreSql и pgAdmin, развернул все с помощью docker-compose.

### Контейнеры:
![image](https://github.com/Alexcrazy42/microservice-learn/assets/95287440/9e9beef2-a0ef-45fd-8df3-e39a00a313f8)

### Swagger апишки (2 GET метода: получение всех пользователей и получение по id, и 1 POST для занесения рандомного пользователя):
![image](https://github.com/Alexcrazy42/microservice-learn/assets/95287440/9d704cbf-2c0d-42b9-a65b-d434dc7583d0)
![image](https://github.com/Alexcrazy42/microservice-learn/assets/95287440/07fd75ad-bdf7-4ac5-b595-9cc2e9b7ce06)
![image](https://github.com/Alexcrazy42/microservice-learn/assets/95287440/8fd5846d-9e1f-458f-aaa3-c9361d7d051a)

### Логи апишки: 
![image](https://github.com/Alexcrazy42/microservice-learn/assets/95287440/573ba461-ac73-431f-90ff-c757bb1e0a9b)

### pgAdmin:
![image](https://github.com/Alexcrazy42/microservice-learn/assets/95287440/431c1178-98b7-4210-b4d0-613f4c59f994)

### Автоматическое внесение нужного значения строки подключения (в среде разработки пустое значение, подставляется при создании контейнера БД, на работе происходит точно так же, локально все строки подключения пусты, автоматическоен подключение происходит при деплое на свою среду разработки в Octopus):
![image](https://github.com/Alexcrazy42/microservice-learn/assets/95287440/bf180301-41c3-4344-ad39-1eb470d0db54)
![image](https://github.com/Alexcrazy42/microservice-learn/assets/95287440/3ece36d2-278b-4a63-993b-05533463b00f)


Дальше хочется сделать много разных сервисов апишки, которые будут общаться через брокер сообщений, использовать кэш, NoSql и все, что вообще в голову придет для освоения новых навыков. Также хочется все сделать в K8S
