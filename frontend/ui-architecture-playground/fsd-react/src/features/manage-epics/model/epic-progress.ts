// ============================================================================
// Агрегация "эпик + его задачи" (gherkin: прогресс "2/5 (40%)").
// Это ЗНАЕТ про две сущности сразу - поэтому живёт в фиче, а не в entities:
// в FSD cross-entity вычисления поднимают на уровень выше.
// Порт computed epicsWithProgress из Vue-версии.
// ============================================================================

import { TaskState } from '@/entities/task';
import type { Task } from '@/entities/task';
import { epicKey } from '@/entities/epic';
import type { Epic } from '@/entities/epic';

export interface EpicRowVM {
    epic: Epic;
    key: string;
    label: string;
    total: number;
    done: number;
    progress: number;            // 0..1 для <progress/>
}

export function buildEpicRows(epics: Epic[], tasks: Task[]): EpicRowVM[] {
    return epics.map(e => {
        const own = tasks.filter(t => t.epicId === e.id);
        const done = own.filter(t => t.state === TaskState.Done).length;
        return {
            epic: e,
            key: epicKey(e),
            label: `${epicKey(e)} · ${e.title} (${done}/${own.length})`,
            total: own.length,
            done,
            progress: own.length === 0 ? 0 : done / own.length,
        };
    });
}
