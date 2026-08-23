// ============================================================================
// МОДЕЛИ ДОМЕНА - TypeScript-порт BoardApp.Core (и models.js из Vue/vanilla).
// Чистые типы и константы: ни Angular, ни DOM.
// ============================================================================

export const TaskState = {
    ToDo: 'todo',
    InProgress: 'inprogress',
    Done: 'done',
} as const;
export type TaskState = (typeof TaskState)[keyof typeof TaskState];

export const STATE_TITLES: Record<TaskState, string> = {
    [TaskState.ToDo]: 'К выполнению',
    [TaskState.InProgress]: 'В работе',
    [TaskState.Done]: 'Готово',
};

export const Priority = { High: 'high', Medium: 'medium', Low: 'low' } as const;
export type Priority = (typeof Priority)[keyof typeof Priority];
export const PRIORITY_TITLES: Record<Priority, string> = {
    high: 'Высокий', medium: 'Средний', low: 'Низкий',
};

export const WorkItemType = { Task: 'task', Bug: 'bug', Story: 'story' } as const;
export type WorkItemType = (typeof WorkItemType)[keyof typeof WorkItemType];
export const TYPE_TITLES: Record<WorkItemType, string> = {
    task: 'Задача', bug: 'Баг', story: 'История',
};

/** Спецзначение «без исполнителя/эпика» - аналог Guid.Empty из C#. */
export const FILTER_NONE = '__none__';

const uid = () => crypto.randomUUID();

export interface User { id: string; name: string }

export interface Epic { id: string; number: number; title: string }

export interface TaskItem {
    id: string;
    number: number;            // ключ TASK-N
    title: string;
    description: string;
    assigneeId: string | null;
    epicId: string | null;
    state: TaskState;
    type: WorkItemType;
    priority: Priority;
    deadline: string | null;   // 'YYYY-MM-DD'
    order: number;             // позиция в колонке (плотная нумерация)
    createdAt: string;
    updatedAt: string;
}

export interface Board {
    id: string;
    name: string;
    epics: Epic[];
    tasks: TaskItem[];
    nextTaskNumber: number;
    nextEpicNumber: number;
}

export function makeBoard(name: string): Board {
    return { id: uid(), name, epics: [], tasks: [], nextTaskNumber: 1, nextEpicNumber: 1 };
}

export function makeUser(name: string): User {
    return { id: uid(), name };
}

/** Спецификация новой задачи (аналог NewTask из C#-версии). */
export interface NewTaskSpec {
    title: string;
    description?: string;
    assigneeId?: string | null;
    epicId?: string | null;
    state?: TaskState;
    type?: WorkItemType;
    priority?: Priority;
    deadline?: string | null;
}

export function makeTask(spec: NewTaskSpec, number: number, order: number): TaskItem {
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

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const isOverdue = (t: TaskItem) =>
    t.deadline !== null && t.deadline < todayIso() && t.state !== TaskState.Done;
