// ============================================================================
// МОДЕЛЬ ЭПИКА - порт Epic из BoardApp.Core.
// Сознательно минималистичная: агрегация "эпик + его задачи" (прогресс)
// живёт в features/manage-epics, потому что в FSD сущности не должны
// импортировать друг друга ради вычислений.
// ============================================================================

export interface Epic {
    id: string;
    number: number;
    title: string;
}

/** Подпись для комбобоксов/панели: "EPIC-2 · Авторизация". */
export const epicLabel = (e: Epic): string => `EPIC-${e.number} · ${e.title}`;

export const epicKey = (e: Epic): string => `EPIC-${e.number}`;
