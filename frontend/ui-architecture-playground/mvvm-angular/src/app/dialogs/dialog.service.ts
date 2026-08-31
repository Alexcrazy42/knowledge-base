// ============================================================================
// DialogService - promise-диалоги (аналог IDialogService в mvvm-wpf и
// ask/answerDialog в mvvm-vue). ViewModel вызывает await ask(...),
// ModalsHostComponent смотрит на сигнал current() и рисует нужное окно.
// VM не знает про DOM - в тестах сервис подменяется фейком.
// ============================================================================

import { Injectable, signal } from '@angular/core';
import { TaskState, WorkItemType, Priority } from '../domain/models';

/** Данные диалога задачи после валидации внутри формы (аналог TaskDialogData). */
export interface TaskDialogResult {
    title: string;
    description: string;
    assigneeId: string | null;
    epicId: string | null;
    state: TaskState;
    type: WorkItemType;
    priority: Priority;
    deadline: string | null;
}

export interface OptionItem { id: string | null; label: string }

export type DialogRequest =
    | { kind: 'prompt'; title: string; label: string; initial?: string; confirmWord?: string }
    | { kind: 'confirm'; message: string }
    | { kind: 'epicDelete'; epicKey: string; epicTitle: string; taskCount: number }
    | {
        kind: 'task';
        existing: Partial<TaskDialogResult> & { deadline?: string | null } | null;
        defaultState: TaskState;
        users: { id: string; label: string }[];
        epics: { id: string; label: string }[];
    };

@Injectable({ providedIn: 'root' })
export class DialogService {
    readonly current = signal<DialogRequest | null>(null);
    #resolver: ((value: unknown) => void) | null = null;

    /** Открыть диалог и дождаться ответа. null = отмена. */
    ask<T>(request: DialogRequest): Promise<T | null> {
        return new Promise(resolve => {
            this.current.set(request);
            this.#resolver = resolve as (value: unknown) => void;
        });
    }

    /** Вызывают модальные компоненты по действию пользователя. */
    answer(value: unknown): void {
        const resolve = this.#resolver;
        this.#resolver = null;
        this.current.set(null);
        resolve?.(value);
    }
}
