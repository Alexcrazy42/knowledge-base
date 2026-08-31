// ============================================================================
// ФИЧА "Управление досками" (gherkin Board Management).
// В FSD фича = завершённый пользовательский сценарий: здесь живут команды
// «создать/переименовать/удалить доску», каждая - диалог + мутация стора.
// Слой выше (page) просто вызывает эти функции из кнопок TopBar.
// ============================================================================

import { confirm, prompt } from '@/shared/ui';
import { kanbanStore } from '@/entities/board';

interface BoardCommandsOptions {
    /** Показать flash-сообщение в статус-баре. */
    flash: (message: string) => void;
    /** Переключить текущую доску (после создания/удаления). */
    onSwitchTo: (boardId: string | null) => void;
}

export function useBoardCommands({ flash, onSwitchTo }: BoardCommandsOptions) {
    async function createBoard(): Promise<void> {
        const name = await prompt({ title: 'Новая доска', label: 'Название доски:' });
        if (!name?.trim()) return;                      // gherkin: пустое имя = ничего не делаем
        const b = kanbanStore.createBoard(name.trim());
        onSwitchTo(b.id);
        flash(`Доска «${b.name}» создана`);
    }

    async function renameBoard(boardId: string | null): Promise<void> {
        const board = kanbanStore.findBoard(boardId);
        if (!board) return;
        const name = await prompt({
            title: 'Переименовать доску',
            label: 'Новое название:',
            initial: board.name,
        });
        if (!name?.trim()) return;
        kanbanStore.renameBoard(board.id, name.trim());
        flash('Доска переименована');
    }

    async function deleteBoard(boardId: string | null): Promise<void> {
        const b = kanbanStore.findBoard(boardId);
        if (!b) return;
        if (!(await confirm(`Удалить доску «${b.name}» вместе со всеми задачами?`))) return;
        kanbanStore.deleteBoard(b.id);
        onSwitchTo(kanbanStore.firstBoard()?.id ?? null);   // gherkin: показать оставшуюся
        flash('Доска удалена');
    }

    return { createBoard, renameBoard, deleteBoard };
}
