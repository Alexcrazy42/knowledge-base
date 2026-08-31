// ============================================================================
// МОДЕЛИ ДОМЕНА - порт BoardApp.Core и models.js из mvp-vanillajs.
// Чистые данные и правила: ни DOM, ни Vue здесь нет.
// ============================================================================

export const TaskState = Object.freeze({
    ToDo: 'todo', InProgress: 'inprogress', Done: 'done'
});

export const STATE_TITLES = Object.freeze({
    [TaskState.ToDo]: 'К выполнению',
    [TaskState.InProgress]: 'В работе',
    [TaskState.Done]: 'Готово'
});

export const Priority = Object.freeze({ High: 'high', Medium: 'medium', Low: 'low' });
export const PRIORITY_TITLES = Object.freeze({
    [Priority.High]: 'Высокий', [Priority.Medium]: 'Средний', [Priority.Low]: 'Низкий'
});

export const WorkItemType = Object.freeze({ Task: 'task', Bug: 'bug', Story: 'story' });
export const TYPE_TITLES = Object.freeze({
    [WorkItemType.Task]: 'Задача', [WorkItemType.Bug]: 'Баг', [WorkItemType.Story]: 'История'
});

export const stateTitle = s => STATE_TITLES[s] ?? s;
export const priorityTitle = p => PRIORITY_TITLES[p] ?? p;
export const typeTitle = t => TYPE_TITLES[t] ?? t;

const uid = () => crypto.randomUUID();

export function makeTask(spec, number, order) {
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
        deadline: spec.deadline ?? null,          // 'YYYY-MM-DD' | null
        order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

export const makeBoard = (name) =>
    ({ id: uid(), name, epics: [], tasks: [], nextTaskNumber: 1, nextEpicNumber: 1 });

export const makeUser = (name) => ({ id: uid(), name });

/** Спецзначение «без исполнителя/эпика» - аналог Guid.Empty из C#. */
export const FILTER_NONE = '__none__';

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const isOverdue = (t) =>
    t.deadline !== null && t.deadline < todayIso() && t.state !== TaskState.Done;
