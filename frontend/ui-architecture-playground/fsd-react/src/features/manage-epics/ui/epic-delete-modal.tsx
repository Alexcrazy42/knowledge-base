// ============================================================================
// EpicDeleteModal - выбор режима удаления эпика (gherkin Epic Management):
//   'detach'  - задачи остаются без эпика (EpicDeleteMode.DetachTasks в C#)
//   'cascade' - задачи удаляются вместе с эпиком
// ============================================================================

import { ModalShell } from '@/shared/ui';

export type EpicDeleteAnswer = 'detach' | 'cascade' | null;

interface EpicDeleteModalProps {
    epicKey: string;                 // "EPIC-1"
    title: string;
    taskCount: number;
    onAnswer: (mode: EpicDeleteAnswer) => void;
}

export function EpicDeleteModal({ epicKey, title, taskCount, onAnswer }: EpicDeleteModalProps) {
    return (
        <ModalShell onCancel={() => onAnswer(null)}>
            <h3>Удаление {epicKey}</h3>
            <p>Удалить {epicKey} «{title}»?</p>
            {taskCount > 0 && <p className="hint">С эпиком связано {taskCount} задач(и). Что с ними сделать?</p>}

            <div className="modal-actions column">
                <button className="btn wide" onClick={() => onAnswer('detach')}>
                    Удалить эпик{taskCount ? ', задачи оставить' : ''}
                </button>
                {/* gherkin: каскад недоступен, когда задач нет */}
                <button className="btn danger wide" disabled={taskCount === 0} onClick={() => onAnswer('cascade')}>
                    Удалить эпик и {taskCount} задач(и)
                </button>
                <button className="btn wide" onClick={() => onAnswer(null)}>Отмена</button>
            </div>
        </ModalShell>
    );
}
