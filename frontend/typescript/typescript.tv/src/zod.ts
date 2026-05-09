import { z } from 'zod';

// const UserSchema = z.object({
//   id: z.number(),
//   name: z.string().min(1),
//   email: z.string().email(),
//   role: z.enum(['user', 'admin']),
//   tags: z.array(z.string()).optional(),
// });

// type User = z.infer<typeof UserSchema>;
// // { id: number; name: string; email: string; role: 'user'|'admin'; tags?: string[] }

// const data = UserSchema.parse({ id: 12, name: 'Alice', email: 'a@test.com', role: 'user', name1: '123' } as unknown);

// console.log(typeof data);

// console.log(data)


// "company": {
//     "name": "Romaguera-Crona",
//     "catchPhrase": "Multi-layered client-server neural-net",

export const AdressSchema = z.object({
  street: z.string().min(1, "Название улицы обязательно"),
  suite: z.string().min(1)
});

export const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Имя обязательно'),
  email: z.string().email('Неверный email'),
  address: AdressSchema
});

export type User = z.infer<typeof UserSchema>;

function createPaginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    pages: z.number().int().optional(),  // Дополнительно
  });
}

export const ErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});

// api.ts
const BASE_URL = 'https://jsonplaceholder.typicode.com';  // Тест API

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function apiFetch<TSchema extends z.ZodTypeAny>(
  endpoint: string,
  options: RequestInit = {},
  schema: TSchema
): Promise<z.infer<TSchema>> {
  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    const parsedError = ErrorSchema.safeParse(error);
    throw new Error(
      parsedError.success 
        ? parsedError.data.message 
        : `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  const result = schema.safeParse(data);

  if (!result.success) {
    console.error('Validation failed:', result.error.issues);
    throw new Error('Invalid response data');
  }

  return result.data;
}


export async function getUser(id: number): Promise<User> {
  return apiFetch(`/users/${id}`, {}, UserSchema);
}

export async function createUser(user: Omit<User, 'id' | 'address'>): Promise<User> {
  return apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  }, UserSchema);
}

const response = getUser(1).then(res => console.log(res));