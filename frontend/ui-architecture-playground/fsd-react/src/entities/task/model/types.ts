// ============================================================================
// МОДЕЛЬ ЗАДАЧИ - порт TaskItem.cs из BoardApp.Core (через models.js Vue).
// Чистые данные и правила: ни DOM, ни React, ни стора здесь нет.
// ============================================================================

import { uid } from '@/shared/lib';

// ---- перечисления как const-объекты + тип-юнион (TS-идиома) ----

export const TaskState = Object.freeze({
    ToDo: 'todo',
    InProgress: 'inprogress',
    Done: 'done',
} as const);
export type TaskState = (typeof TaskState)[keyof typeof TaskState];

export const STATE_TITLES: Readonly<Record<TaskState, string>> = Object.freeze({
    [TaskState.ToDo]: 'К выполнению',
    [TaskState.InProgress]: 'В работе',
    [TaskState.Done]: 'Готово',
});

export const Priority = Object.freeze({ High: 'high', Medium: 'medium', Low: 'low' } as const);
export type Priority = (typeof Priority)[keyof typeof Priority];

export const PRIORITY_TITLES: Readonly<Record<Priority, string>> = Object.freeze({
    [Priority.High]: 'Высокий',
    [Priority.Medium]: 'Средний',
    [Priority.Low]: 'Низкий',
});

export const WorkItemType = Object.freeze({ Task: 'task', Bug: 'bug', Story: 'story' } as const);
export type WorkItemType = (typeof WorkItemType)[keyof typeof WorkItemType];

export const TYPE_TITLES: Readonly<Record<WorkItemType, string>> = Object.freeze({
    [WorkItemType.Task]: 'Задача',
    [WorkItemType.Bug]: 'Баг',
    [WorkItemType.Story]: 'История',
});

export const stateTitle = (s: TaskState): string => STATE_TITLES[s] ?? s;
export const priorityTitle = (p: Priority): string => PRIORITY_TITLES[p] ?? p;
export const typeTitle = (t: WorkItemType): string => TYPE_TITLES[t] ?? t;

/** Спецзначение «без исполнителя/эпика» - аналог Guid.Empty из C#. */
export const FILTER_NONE = '__none__';

// ---- данные ----

export interface Task {
    id: string;
    number: number;
    title: string;
    description: string;
    assigneeId: string | null;
    epicId: string | null;
    state: TaskState;
    type: WorkItemType;
    priority: Priority;
    deadline: string | null;      // 'YYYY-MM-DD' | null
    order: number;                // позиция внутри колонки
    createdAt: string;
    updatedAt: string;
}

/** Данные формы создания/редактирования - аналог TaskDialogData в C#. */
export interface TaskSpec {
    title: string;
    description?: string;
    assigneeId?: string | null;
    epicId?: string | null;
    state?: TaskState;
    type?: WorkItemType;
    priority?: Priority;
    deadline?: string | null;
}

export function makeTask(spec: TaskSpec, number: number, order: number): Task {
    const now = new Date().toISOString();
    return {
        id: uid(),
        number,
        title: spec.title,
        description: spec.description ?? '',
        assigneeId: spec.assigneeId ?? null,
        epicId: spec.epicId ?? null,
        state: spec.state ?? TaskState.ToDo,
        type: spec.type ?? WorkItemType.Task,
        priority: spec.priority ?? Priority.Medium,
        deadline: spec.deadline ?? null,
        order,
        createdAt: now,
        updatedAt: now,
    };
}

/** gherkin: просрочена = дедлайн в прошлом и задача ещё не Done. */
export const isOverdue = (t: Task): boolean =>
    t.deadline !== null && t.deadline < new Date().toISOString().slice(0, 10)
    && t.state !== TaskState.Done;
