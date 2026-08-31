// ============================================================================
// View-модель карточки задачи: плоские готовые подписи для рендера.
// Зачем: TaskCard не должен лезть в стор и словари - он получает ГОТОВОЕ.
// (Тот же приём toCard() из Vue-версии.)
// Контекст передаётся колбэками, поэтому entities/task не импортирует
// entities/user / entities/epic - правило запрета cross-imports соблюдено.
// ============================================================================

import { formatDayMonth } from '@/shared/lib';
import { isOverdue, priorityTitle, typeTitle } from './types';
import type { Priority, Task, WorkItemType } from './types';

export interface TaskCardVM {
    task: Task;
    key: string;                 // "TASK-7"
    assignee: string;            // имя или 'не назначен'
    epicKey: string | null;      // "EPIC-1" | null
    priorityLabel: string;
    typeLabel: string;
    overdue: boolean;
    deadlineLabel: string | null;
}

export interface TaskCardContext {
    userNameOf: (userId: string | null) => string;
    /** Номер эпика по id; null если эпика нет. */
    epicNumberOf: (epicId: string | null) => number | null;
}

export function buildTaskCard(task: Task, ctx: TaskCardContext): TaskCardVM {
    const epicNumber = ctx.epicNumberOf(task.epicId);
    return {
        task,
        key: `TASK-${task.number}`,
        assignee: ctx.userNameOf(task.assigneeId),
        epicKey: task.epicId && epicNumber !== null ? `EPIC-${epicNumber}` : null,
        priorityLabel: priorityTitle(task.priority),
        typeLabel: typeTitle(task.type),
        overdue: isOverdue(task),
        deadlineLabel: task.deadline ? formatDayMonth(task.deadline) : null,
    };
}

export type { Priority, WorkItemType };
