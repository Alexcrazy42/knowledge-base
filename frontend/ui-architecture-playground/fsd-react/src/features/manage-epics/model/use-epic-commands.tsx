// ============================================================================
// Команды фичи "Управление эпиками": создать, тест-сид, удалить выбранный
// (с выбором режима через EpicDeleteModal на промисе ask()).
// ============================================================================

import { ask, prompt } from '@/shared/ui';
import { kanbanStore } from '@/entities/board';
import { EpicDeleteModal } from '../ui/epic-delete-modal';
import type { EpicDeleteAnswer } from '../ui/epic-delete-modal';
import type { EpicRowVM } from './epic-progress';

interface EpicCommandsOptions {
    flash: (message: string) => void;
}

export function useEpicCommands({ flash }: EpicCommandsOptions) {
    async function createEpic(boardId: string | null): Promise<void> {
        if (!kanbanStore.findBoard(boardId)) return;
        const title = await prompt({ title: 'Новый эпик', label: 'Название эпика:' });
        if (!title?.trim()) return;
        const epic = kanbanStore.addEpic(boardId as string, title.trim());
        if (epic) flash(`EPIC-${epic.number} создан`);
    }

    function seedTestEpic(boardId: string | null): void {
        if (!kanbanStore.findBoard(boardId)) return;
        const epic = kanbanStore.seedTestEpic(boardId as string);
        flash(epic ? `EPIC-${epic.number} с тестовыми задачами добавлен` : 'Не удалось создать эпик');
    }

    /** gherkin: удаление непустого эпика спрашивает режим судьбы задач. */
    async function deleteSelectedEpic(boardId: string | null, row: EpicRowVM): Promise<void> {
        const board = kanbanStore.findBoard(boardId);
        if (!board) return;

        const mode = await ask<EpicDeleteAnswer>(answer => (
            <EpicDeleteModal
                epicKey={row.key}
                title={row.epic.title}
                taskCount={row.total}
                onAnswer={answer}
            />
        ));
        if (!mode) return;

        kanbanStore.deleteEpic(board.id, row.epic.id, mode);
        // После удаления выбранная строка протухает - сброс делает страница.
        flash(mode === 'cascade'
            ? `${row.key} удалён вместе с задачами`
            : `${row.key} удалён, задачи остались`);
    }

    function seedRandomTasks(boardId: string | null): void {
        if (!kanbanStore.findBoard(boardId)) return;
        kanbanStore.seedRandomTasks(boardId as string, 10);
        flash('Добавлено 10 случайных задач');
    }

    return { createEpic, seedTestEpic, deleteSelectedEpic, seedRandomTasks };
}
