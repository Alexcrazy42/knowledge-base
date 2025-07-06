type Constructor<T> = new () => T;

class ObjectMapper<T> {
      private typeMap = new Map<Function, any>();
    
      constructor(private readonly targetClass: Constructor<T>) {
        // Регистрация вложенных типов, если нужно
        this.typeMap.set(Address, this.mapAddress.bind(this));
      }
    
      private mapAddress(data: any): Address {
        const address = new Address();
        address.city = data.city;
        address.zip = data.zip;
        return address;
      }
    
      private mapValue(key: string, value: any, targetType: any): any {
          if (value === null || value === undefined) return value;
      
          // Если это дата
          if (targetType === Date && typeof value === 'string' && !isNaN(Date.parse(value))) {
              return new Date(value);
          }
      
          // Если есть пользовательский маппер
          if (value instanceof Object && this.typeMap.has(targetType)) {
              return this.typeMap.get(targetType)(value);
          }
      
          // Проверяем, что targetType — функция
          if (typeof targetType !== 'function') {
              throw new Error(`Ожидается функция-конструктор для поля "${key}", получено ${typeof targetType}`);
          }
      
          // Проверка типа
          const expectedType = typeof new targetType();
          const actualType = typeof value;
      
          if (actualType !== expectedType) {
              throw new Error(`Неверный тип для поля "${key}": ожидается ${expectedType}, получено ${actualType}`);
          }
      
          return value;
      }
    
      public map(source: string | object): T {
        let data: any = source;
    
        if (typeof source === 'string') {
          try {
            data = JSON.parse(source);
          } catch (e) {
            throw new Error('Ошибка парсинга JSON');
          }
        }
    
        const instance = new this.targetClass();
    
        for (const key in data) {
          if (data.hasOwnProperty(key) && Object.prototype.hasOwnProperty.call(instance, key)) {
            const propertyType = (instance as any)[key]?.constructor;
            (instance as any)[key] = this.mapValue(key, data[key], propertyType);
          }
        }
    
        return instance;
      }
}

class Address {
    city!: string;
    zip!: string;
}
    
class User {
    name!: string;
    age!: number;
    isAdmin!: boolean;
    address!: Address;
    registeredAt!: Date;
}


// ------------- 

// JSON со вложенными объектами и датой
const jsonString = `
{
  "name": "Alice",
  "age": 30,
  "isAdmin": false,
  "address": {
    "city": "Москва",
    "zip": "12345"
  },
  "registeredAt": "2023-01-01T12:00:00Z"
}
`;


const obj = JSON.parse(jsonString);

const user = new ObjectMapper(User).map(jsonString);
console.log(user);
console.log(user.registeredAt instanceof Date); // true

fetch('https://jsonplaceholder.typicode.com/posts/1 ')
  .then(response => response.json())
  .then(data => {
    const post = new ObjectMapper(Post).map(data);
    console.log(post);
  });