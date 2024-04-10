# mongodb .net driver

Материалы:
1) [MongoDb C# Driver](https://www.mongodb.com/docs/drivers/csharp/current)
2) [MongoDb C# Driver Api doc](https://mongodb.github.io/mongo-csharp-driver/2.24.0/api/index.html)

Главные темы CRUD операций:
1) CRUD операции

Ничего сложного в этом нет 
[Дока](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/crud)

2) Аггрегации
[EmptyPipelineDefinition](https://mongodb.github.io/mongo-csharp-driver/2.24.0/api/MongoDB.Driver/MongoDB.Driver.PipelineDefinitionBuilder.html)

3) LINQ
[LINQ дока](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/linq/)
Основные тезисы:
1) Чтобы использовать LINQ нужно сначала создать IQueryable объект. 

4) Настройка документов посредством аттрибутов или BsonClassMap (мне больше нравится аттрибутами)
[Дока](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/serialization/poco)
1) [BsonElement(Order = 2)]
2) [BsonId]
3) [BsonIgnore] - для игнорирования неопределенных свойств во время сериализации
4) [BsonDefaultValue(1900)]
5) [BsonIgnoreIfDefault]