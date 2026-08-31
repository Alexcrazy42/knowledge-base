import type { ScreenLayoutDto, ScreenMetaDto } from './contract';

// REST для режима дизайнера. Это НЕ экранный контракт: дизайнер — инструмент
// поверх SDUI, он читает/пишет раскладки и переиспользует тот же рендерер.

export async function fetchLayoutMeta(): Promise<ScreenMetaDto[]> {
  const res = await fetch('/api/layout/meta');
  if (!res.ok) throw new Error(`Ошибка /api/layout/meta: HTTP ${res.status}`);
  return (await res.json()) as ScreenMetaDto[];
}

export async function fetchLayout(screen: string): Promise<ScreenLayoutDto> {
  const res = await fetch(`/api/layout/${screen}`);
  if (!res.ok) throw new Error(`Ошибка /api/layout/${screen}: HTTP ${res.status}`);
  return (await res.json()) as ScreenLayoutDto;
}

export async function saveLayout(screen: string, layout: ScreenLayoutDto): Promise<ScreenLayoutDto> {
  const res = await fetch(`/api/layout/${screen}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(layout),
  });
  if (!res.ok) throw new Error(`Ошибка PUT /api/layout/${screen}: HTTP ${res.status}`);
  return (await res.json()) as ScreenLayoutDto;
}

export async function restoreLayout(screen: string): Promise<ScreenLayoutDto> {
  const res = await fetch(`/api/layout/${screen}/restore`, { method: 'POST' });
  if (!res.ok) throw new Error(`Ошибка restore /api/layout/${screen}: HTTP ${res.status}`);
  return (await res.json()) as ScreenLayoutDto;
}