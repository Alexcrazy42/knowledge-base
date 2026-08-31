// ============================================================================
// МОДЕЛЬ ДОСКИ - порт Board из BoardApp.Core.
//
// ЗАМЕТКА О ПРАВИЛАХ FSD: доска агрегирует задачи и эпики, поэтому
// entities/board импортирует @entities/task и @entities/epic. Это осознанное
// отступление от строгого запрета cross-imports внутри слоя: зависимость
// ОДНОНАПРАВЛЕННАЯ (task и epic про доску не знают), циклов нет. В больших
// проектах такие связи оформляют @x-сегментами или поднимают тип выше.
// ============================================================================

import { uid } from '@/shared/lib';
import type { Epic } from '@/entities/epic';
import type { Task } from '@/entities/task';

export interface Board {
    id: string;
    name: string;
    epics: Epic[];
    tasks: Task[];
    nextTaskNumber: number;
    nextEpicNumber: number;
}

export const makeBoard = (name: string): Board => ({
    id: uid(),
    name,
    epics: [],
    tasks: [],
    nextTaskNumber: 1,
    nextEpicNumber: 1,
});
