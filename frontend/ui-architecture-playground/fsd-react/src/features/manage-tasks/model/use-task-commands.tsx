// ============================================================================
// Команды фичи "Управление задачами" (gherkin Task Management):
// openTaskEditor - создание/редактирование через TaskModal на промисе ask();
// deleteCard - подтверждение и удаление.
// Сами сценарии здесь: страница только передаёт (карточка | null, колонка).
// ============================================================================

import { ask, confirm } from '@/shared/ui';
import { kanbanStore } from '@/entities/board';
import type { TaskCardVM } from '@/entities/task';
import { epicLabel } from '@/entities/epic';
import { TaskState } from '@/entities/task';
import { TaskModal } from '../ui/task-modal';
import type { TaskFormResult } from '../ui/task-modal';

interface TaskCommandsOptions {
    flash: (message: string) => void;
}

export function useTaskCommands({ flash }: TaskCommandsOptions) {
    /**
     * existingTaskId=null -> создание в колонке defaultState.
     * Опции пользователей/эпиков снимаются в момент открытия диалога
     * (как во Vue-версии), а не подпиской - форма живёт один "кадр".
     */
    async function openTaskEditor(
        boardId: string | null,
        existingTaskId: string | null = null,
        defaultState: TaskState = TaskState.ToDo,
    ): Promise<void> {
        const board = kanbanStore.findBoard(boardId);
        if (!board) return;

        const task = existingTaskId ? board.tasks.find(t => t.id === existingTaskId) ?? null : null;

        const result = await ask<TaskFormResult | null>(answer => (
            <TaskModal
                existing={task ? {
                    title: task.title,
                    description: task.description,
                    assigneeId: task.assigneeId,
                    epicId: task.epicId,
                    state: task.state,
                    type: task.type,
                    priority: task.priority,
                    deadline: task.deadline ?? '',
                } : null}
                defaultState={defaultState}
                users={kanbanStore.users.map(u => ({ id: u.id, label: u.name }))}
                epics={board.epics.map(e => ({ id: e.id, label: epicLabel(e) }))}
                onAnswer={answer}
            />
        ));
        if (!result) return;                                     // отмена

        if (task) {
            kanbanStore.updateTask(board.id, task.id, result);
            flash(`TASK-${task.number} сохранена`);
        } else {
            const created = kanbanStore.addTask(board.id, result);
            if (created) flash(`TASK-${created.number} создана`);
        }
    }

    async function deleteCard(boardId: string | null, card: TaskCardVM): Promise<void> {
        if (!kanbanStore.findBoard(boardId)) return;
        if (!(await confirm(`Удалить ${card.key} «${card.task.title}»?`))) return;
        kanbanStore.deleteTask(boardId as string, card.task.id);
        flash(`${card.key} удалена`);
    }

    /** DnD: индекс вставки считает колонка; стор перенумеровывает orders. */
    function moveTask(boardId: string | null, taskId: string, targetState: TaskState, targetIndex: number): void {
        if (!kanbanStore.findBoard(boardId)) return;
        kanbanStore.moveTask(boardId as string, taskId, targetState, targetIndex);
    }

    return { openTaskEditor, deleteCard, moveTask };
}
