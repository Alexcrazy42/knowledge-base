import type { ActionDto, MutationReply, ScreenDoc } from './contract';

// Единственное место, где клиент знает имена экранов -> URL. Логики за ними нет:
// каталог, детали и форму придумал бэкенд.
const SCREEN_PATHS: Record<string, string> = {
  catalog: '/api/screens/catalog',
  product: '/api/screens/product',
  'form-product': '/api/screens/form-product',
  dashboard: '/api/screens/dashboard',
  categories: '/api/screens/categories',
  'form-category': '/api/screens/form-category',
  search: '/api/screens/search',
  stats: '/api/screens/stats',
  settings: '/api/screens/settings',
};

export async function fetchScreen(screen: string, query?: string): Promise<ScreenDoc> {
  const base = SCREEN_PATHS[screen];
  if (!base) throw new Error(`Неизвестный экран в схеме: "${screen}"`);
  const res = await fetch(base + (query ? `?${query}` : ''));
  if (!res.ok) throw new Error(`Сервер не отдал схему ${screen}: HTTP ${res.status}`);
  return (await res.json()) as ScreenDoc;
}

export async function submitForm(payload: {
  form: string;
  id?: number | null;
  values: Record<string, string | number | boolean>;
}): Promise<MutationReply> {
  return postJson('/api/runtime/submit', payload);
}

export async function deleteEntity(entity: string, entityId: number): Promise<MutationReply> {
  return postJson('/api/runtime/delete', { entity, id: entityId });
}

export async function applyMutation(payload: {
  op: string;
  entity: string;
  id?: number | null;
  delta?: number;
  set?: number;
}): Promise<MutationReply> {
  return postJson('/api/runtime/apply', payload);
}

export async function resetDemo(): Promise<MutationReply> {
  return postJson('/api/runtime/reset', {});
}

async function postJson(url: string, body: unknown): Promise<MutationReply> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ошибка ${url}: HTTP ${res.status}`);
  return (await res.json()) as MutationReply;
}

export function screenActionToRoute(a: ActionDto) {
  if (a.type === 'navigate') return { screen: a.screen, query: a.query };
  return null;
}

export function defaultActionLabel(a: ActionDto): string {
  switch (a.type) {
    case 'navigate':
      return 'Перейти';
    case 'back':
      return '← Назад';
    case 'refresh':
      return '⟳ Обновить';
    case 'delete':
      return 'Удалить';
    case 'reset':
      return 'Сбросить';
    case 'apply':
      return 'Применить';
  }
}