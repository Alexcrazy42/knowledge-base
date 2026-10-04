import { z } from 'zod';

export const apiClient = {
  get: async <T extends z.ZodTypeAny>(
    url: string,
    schema: T
  ): Promise<z.infer<T>> => {
    const response = await fetch(`https://dummyjson.com${url}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const result = schema.safeParse(data);

    if (!result.success) {
      // В продакшене можно отправлять это в Sentry/LogRocket
      console.error('Zod validation failed:', result.error.format());
      throw new Error('Неверный формат ответа от сервера');
    }

    return result.data;
  },
};