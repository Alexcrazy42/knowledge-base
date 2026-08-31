// Публичный API сущности "Доска" (+ глобальный стор канбана).

export { kanbanStore } from './model/store';
export type { KanbanState } from './model/store';
export { makeBoard } from './model/types';
export type { Board } from './model/types';
export { useKanbanState, useBoardById } from './model/use-kanban';
