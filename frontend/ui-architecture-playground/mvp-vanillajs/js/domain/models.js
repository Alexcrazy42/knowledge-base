// ============================================================================
// МОДЕЛИ ДОМЕНА - JS-порт BoardApp.Core (Enums.cs + Models).
// Ничего не знает ни о DOM, ни о презентерах: чистые данные и правила.
// ============================================================================

'use strict';

// "Enum" в JS = замороженный объект со словарём подписей.
// display() - аналог C#-расширяющего метода ToDisplay().
const TaskState = Object.freeze({
    ToDo: 'todo', InProgress: 'inprogress', Done: 'done'
});

const STATE_TITLES = Object.freeze({
    [TaskState.ToDo]: 'К выполнению',
    [TaskState.InProgress]: 'В работе',
    [TaskState.Done]: 'Готово'
});

const Priority = Object.freeze({ High: 'high', Medium: 'medium', Low: 'low' });
const PRIORITY_TITLES = Object.freeze({
    [Priority.High]: 'Высокий', [Priority.Medium]: 'Средний', [Priority.Low]: 'Низкий'
});

const WorkItemType = Object.freeze({ Task: 'task', Bug: 'bug', Story: 'story' });
const TYPE_TITLES = Object.freeze({
    [WorkItemType.Task]: 'Задача', [WorkItemType.Bug]: 'Баг', [WorkItemType.Story]: 'История'
});

const stateTitle = s => STATE_TITLES[s] ?? s;
const priorityTitle = p => PRIORITY_TITLES[p] ?? p;
const typeTitle = t => TYPE_TITLES[t] ?? t;

/** Стабильный uid; crypto.randomUUID есть во всех современных браузерах. */
const uid = () => (crypto.randomUUID ? crypto.randomUUID() :
    'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));

/**
 * Фабрика задачи. Поля совпадают с C#-классом TaskItem.
 * Order - позиция внутри колонки; number - глобальный счётчик доски для ключа TASK-N.
 */
function makeTask(spec, number, order) {
    return {
        id: uid(),
        number,                       // ключ TASK-number
        title: spec.title,
        description: spec.description ?? '',
        assigneeId: spec.assigneeId ?? null,
        epicId: spec.epicId ?? null,
        state: spec.state ?? TaskState.ToDo,
        type: spec.type ?? WorkItemType.Task,
        priority: spec.priority ?? Priority.Medium,
        deadline: spec.deadline ?? null,   // 'YYYY-MM-DD' | null
        order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

const makeBoard = (name) => ({ id: uid(), name, epics: [], tasks: [], nextTaskNumber: 1, nextEpicNumber: 1 });
const makeUser = (name) => ({ id: uid(), name });

/**
 * Спецзначение фильтра "без исполнителя/эпика" - JS-аналог Guid.Empty из
 * FilterSpecial.None. Объявлен здесь ОДИН раз: классические скрипты делят
 * общий глобальный лексический скоуп, повторный const вызвал бы ошибку.
 */
const FILTER_NONE = '__none__';
