// Публичный API сущности "Задача".

export {
    TaskState, STATE_TITLES, Priority, PRIORITY_TITLES,
    WorkItemType, TYPE_TITLES, FILTER_NONE,
    stateTitle, priorityTitle, typeTitle,
    isOverdue, makeTask,
} from './model/types';
export type { Task, TaskSpec } from './model/types';

export { applyTaskFilters, defaultFilterCriteria } from './model/filters';
export type { TaskFilterCriteria } from './model/filters';

export { buildTaskCard } from './model/card';
export type { TaskCardVM, TaskCardContext } from './model/card';

export { TaskCard } from './ui/task-card';
