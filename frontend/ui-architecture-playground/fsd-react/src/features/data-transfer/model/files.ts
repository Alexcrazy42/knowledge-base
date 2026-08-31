// Файловый ввод-вывод браузера (gherkin Persistence).
// Вынесено отдельно от команд, чтобы в тестах подменить только это.

/** Скачивание JSON-файла (как экспорт в vanilla-презентере). */
export function downloadJson(filename: string, text: string): void {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Диалог выбора .json-файла; текст файла резолвится промисом.
 * null - пользователь закрыл диалог без выбора.
 */
export function pickJsonText(): Promise<string | null> {
    return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();             // асинхронное чтение файла
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
        };
        input.click();
    });
}
