// ============================================================================
// ФИЧА "Перенос данных" (gherkin Persistence + полный сброс):
// экспорт JSON в файл, импорт из файла, сброс всего по слову СБРОС.
// Работа с файловым вводом-выводом браузера - чистый DOM, поэтому
// отделена в files.ts (легко подменить в тестах).
// ============================================================================

import { prompt } from '@/shared/ui';
import { kanbanStore } from '@/entities/board';
import { downloadJson, pickJsonText } from './files';

interface DataCommandsOptions {
    flash: (message: string) => void;
    /** Вызывается после import/reset - страница должна пересинхронизировать id. */
    onStateReplaced: () => void;
}

export function useDataCommands({ flash, onStateReplaced }: DataCommandsOptions) {
    function exportJson(): void {
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        downloadJson(`kanban-export-${stamp}.json`, kanbanStore.exportJson());
        flash('Данные экспортированы в JSON');
    }

    async function importJson(): Promise<void> {
        const text = await pickJsonText();
        if (text === null) return;                       // пользователь отменил выбор файла
        try {
            kanbanStore.importJson(text);
            onStateReplaced();
            flash('Импорт выполнен');
        } catch (err) {
            flash(`Ошибка импорта: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    /** gherkin: полное очищение подтверждается словом СБРОС. */
    async function resetAll(): Promise<void> {
        const word = await prompt({
            title: 'Подтверждение',
            label: 'Для полного сброса всех данных введите слово СБРОС:',
            confirmWord: 'СБРОС',
        });
        if (word !== 'СБРОС') {
            flash('Сброс отменён (нужно слово СБРОС)');
            return;
        }
        kanbanStore.resetAll();
        onStateReplaced();
        flash('Все данные удалены');
    }

    return { exportJson, importJson, resetAll };
}
