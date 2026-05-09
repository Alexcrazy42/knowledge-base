// INTERFACES

// Базовый интерфейс
interface User {
  name: string;
}

// Merging: добавляем свойства
interface User {
  age: number;
  greet(): string;
}

// Расширение и implements в классе
interface Admin extends User {
  role: string;
}

class UserImpl implements Admin, User {
  constructor(readonly name: string, public age: number, public role: string) {}
  greet() { return `Hi, ${this.name}`; }
}

var user = new UserImpl('userImpl', 12, 'role1');
console.log(user.greet());


// TYPES

// Union и primitives
type ID = string | number;
type Primitive = string | number | boolean;

// Intersection
type Person = { name: string } & { age: number };

// Tuple
type Point = [number, number];

// Mapped type
type PartialUser = { [K in keyof User]?: User[K] };

// Conditional + infer (inference)
type ElementType<T> = T extends (infer U)[] ? U : never;
type ArrayElement = ElementType<string[]>;

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type PromisedName = UnwrapPromise<Promise<string>>;

const id: ID = 'abc';
const point: Point = [10, 20];
const partial: PartialUser = { name: 'Alice' };


// BRANDED TYPES

declare const __brand: unique symbol;
export type Brand<B> = { [__brand]: B };
export type UserId = string & Brand<'UserId'>;
type ProductId = string & Brand<'ProductId'>;

// Функция только для UserId
function getUser(id: UserId) { /* ... */ }
// getUser('123' as ProductId);  // Ошибка!

// Создание бренда
function createUserId(id: string): UserId {
  return id as UserId;
}


// DISCRIMINANTS

type Loading = { state: 'loading' };
type Success<T> = { state: 'success'; data: T };
type Error = { state: 'error'; error: string };

type ApiResult<T> = Loading | Success<T> | Error;

function handleResult<T>(result: ApiResult<T>) {
  if (result.state === 'loading') { 
    console.log(result)
  }
  else if (result.state === 'success') { 
    console.log(result.data)
  }
  else { 
    console.log(result.error)
  }
}

handleResult({state: 'success', data: 5} as Success<number>)