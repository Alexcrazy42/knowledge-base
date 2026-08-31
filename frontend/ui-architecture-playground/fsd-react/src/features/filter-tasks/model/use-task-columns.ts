// ============================================================================
// ФИЧА "Фильтрация задач" (gherkin Task Filtering):
// FilterBar - контролируемый компонент панели фильтров;
// useTaskColumns - вычисление колонок канбана из снапшота стора
// (порт computed visibleTasks + columns из Vue-версии).
// ============================================================================

import { useMemo } from 'react';
import {
    STATE_TITLES, TaskState, applyTaskFilters, buildTaskCard, defaultFilterCriteria,
} from '@/entities/task';
import type { TaskCardVM, TaskFilterCriteria } from '@/entities/task';
import type { Board } from '@/entities/board';
import type { User } from '@/entities/user';

export type { TaskFilterCriteria };
export { defaultFilterCriteria };

export interface KanbanColumnVM {
    state: TaskState;
    title: string;
    cards: TaskCardVM[];
}

interface UseTaskColumnsArgs {
    board: Board | null;
    users: User[];
    criteria: TaskFilterCriteria;
}

export function useTaskColumns({ board, users, criteria }: UseTaskColumnsArgs): KanbanColumnVM[] {
    return useMemo(() => {
        const tasks = board?.tasks ?? [];
        const visible = applyTaskFilters(tasks, criteria);

        const ctx = {
            userNameOf: (id: string | null) =>
                id ? users.find(u => u.id === id)?.name ?? 'не назначен' : 'не назначен',
            epicNumberOf: (id: string | null) =>
                id ? board?.epics.find(e => e.id === id)?.number ?? null : null,
        };

        // Три колонки канбана как чистое вычисление - никакого rebuild-кода.
        return Object.values(TaskState).map(stateValue => ({
            state: stateValue,
            title: STATE_TITLES[stateValue],
            cards: visible.filter(t => t.state === stateValue).map(t => buildTaskCard(t, ctx)),
        }));
    }, [board, users, criteria]);
}
