// Публичный API сегмента shared/lib.
// Правило FSD: импортировать наружу можно ТОЛЬКО то, что перечислено здесь.

export { uid } from './id';
export { loadJson, saveJson, removeKey } from './storage';
export { todayIso, formatDayMonth } from './datetime';
