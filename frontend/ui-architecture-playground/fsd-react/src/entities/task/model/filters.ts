// ============================================================================
// Правила фильтрации/сортировки задач (gherkin Task Filtering).
// Чистая функция: те же критерии, что во всех версиях проекта -
// поиск по заголовку+описанию, исполнитель, эпик, опция «Сначала High».
// null = «показывать всех», FILTER_NONE = «только без значения».
// ============================================================================

import {
    FILTER_NONE, Priority,
} from './types';
import type { Task } from './types';

export interface TaskFilterCriteria {
    search: string;
    assigneeId: string | null;   // null | userId | FILTER_NONE
    epicId: string | null;       // null | epicId | FILTER_NONE
    highFirst: boolean;
}

export const defaultFilterCriteria: TaskFilterCriteria = {
    search: '',
    assigneeId: null,
    epicId: null,
    highFirst: false,
};

const rank = (p: Task['priority']): number =>
    p === Priority.High ? 0 : p === Priority.Medium ? 1 : 2;

export function applyTaskFilters(tasks: Task[], criteria: TaskFilterCriteria): Task[] {
    let q = [...tasks];

    if (criteria.assigneeId !== null) {
        q = q.filter(t => criteria.assigneeId === FILTER_NONE
            ? t.assigneeId === null
            : t.assigneeId === criteria.assigneeId);
    }

    if (criteria.epicId !== null) {
        q = q.filter(t => criteria.epicId === FILTER_NONE
            ? t.epicId === null
            : t.epicId === criteria.epicId);
    }

    const needle = criteria.search.trim().toLowerCase();
    if (needle) {
        q = q.filter(t => (t.title + ' ' + t.description).toLowerCase().includes(needle));
    }

    // Сортировка НЕ мутирует исходный массив - работаем с копией q.
    if (criteria.highFirst) {
        q.sort((a, z) => rank(a.priority) - rank(z.priority) || a.order - z.order);
    } else {
        q.sort((a, z) => a.order - z.order);
    }
    return q;
}
