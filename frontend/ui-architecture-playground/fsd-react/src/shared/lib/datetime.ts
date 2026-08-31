// Чистые функции дат. Никакой зависимости от домена и React.

/** Сегодняшняя дата в формате 'YYYY-MM-DD' (как deadline в модели). */
export const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** '2026-08-24' -> '24.08' для карточки задачи. */
export function formatDayMonth(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
