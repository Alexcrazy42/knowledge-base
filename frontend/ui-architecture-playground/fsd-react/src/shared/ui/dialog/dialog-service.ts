// ============================================================================
// dialogService - мини-"DialogService" на промисах (аналог IDialogService
// из mvvm-wpf и ask()/answerDialog() из mvmm-vue).
//
// Идея: любой слой ниже app может вызвать `const name = await prompt({...})`
// и НЕ ЗНАТЬ, кто рисует окно. Окна монтирует единственный <DialogHost/>
// в слое app. Это позволяет фичам оставаться чистыми сценариями,
// а подмену диалогов в тестах делать одной заглушкой сервиса.
//
// Хранилище - иммутабельный массив записей + подписки:
// так его можно читать через useSyncExternalStore (см. dialog-host.tsx).
// ============================================================================

import type { ReactNode } from 'react';

interface DialogEntry {
    id: number;
    content: ReactNode;
}

let nextId = 1;
let entries: DialogEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach(l => l());
}

export const dialogService = {
    subscribe(listener: () => void): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    /** Снапшот для useSyncExternalStore - ссылка меняется только при мутациях. */
    getEntries(): DialogEntry[] {
        return entries;
    },

    open(content: ReactNode): number {
        const id = nextId++;
        entries = [...entries, { id, content }];
        notify();
        return id;
    },

    close(id: number): void {
        entries = entries.filter(e => e.id !== id);
        notify();
    },
};

/**
 * Открыть диалог, содержимое которого строит колбэк render.
 * render получает функцию answer: вызов answer(value) закрывает окно
 * и резолвит промис. Esc-аналог - просто answer(null).
 */
export function ask<T>(render: (answer: (value: T) => void) => ReactNode): Promise<T> {
    return new Promise<T>(resolve => {
        const answer = (value: T) => {
            dialogService.close(id);
            resolve(value);
        };
        const id = dialogService.open(render(answer));
    });
}
