// ============================================================================
// KanbanViewModel - "ViewModel" главного экрана (Angular-версия useKanbanViewModel).
//
// Сигналы = bindable-состояние (аналог ObservableProperty в WPF, ref в Vue).
// computed = вычисляемое состояние (пересчёт и уведомление View - автоматически).
// Методы = команды. Логика 1:1 с MainViewModel.cs / useKanbanViewModel.js.
// ============================================================================

import { computed, inject, Injectable, signal } from '@angular/core';
import { BoardStoreService } from '../domain/board-store.service';
import { DialogService, TaskDialogResult } from '../dialogs/dialog.service';
import {
    Board, Epic, TaskItem,
    Priority, TaskState,
    FILTER_NONE, STATE_TITLES, PRIORITY_TITLES, TYPE_TITLES,
    isOverdue,
} from '../domain/models';

/** Карточка для шаблона: домен + уже готовые подписи (как toCard в Vue). */
export interface CardVm {
    task: TaskItem;
    key: string;
    assignee: string;
    epicKey: string | null;
    priorityLabel: string;
    typeLabel: string;
    overdue: boolean;
}

const priorityRank = (p: Priority) => p === 'high' ? 0 : p === 'medium' ? 1 : 2;

/**
 * VM создаётся DI-контейнером (inject внутри конструктора требует контекста
 * инъекции) - поэтому providedIn: 'root', а не new в компоненте.
 */
@Injectable({ providedIn: 'root' })
export class KanbanViewModel {
    readonly store = inject(BoardStoreService);
    readonly dialogs = inject(DialogService);

    // ----- bindable-состояние -----
    readonly currentBoardId = signal<string | null>(this.store.firstBoard()?.id ?? null);
    readonly search = signal('');
    /** null | userId | FILTER_NONE */
    readonly assigneeFilter = signal<string | null>(null);
    readonly epicFilter = signal<string | null>(null);
    readonly sortByPriority = signal(false);
    readonly flash = signal('Создайте первую доску');

    // ----- вычисляемое -----

    readonly boards = this.store.boards;                 // проброс сигнала

    readonly currentBoard = computed<Board | null>(() =>
        this.store.findBoard(this.currentBoardId()));

    readonly users = this.store.users;

    readonly assigneeOptions = computed(() => [
        { id: null, label: '(все исполнители)' },
        { id: FILTER_NONE, label: 'Без исполнителя' },
        ...this.store.users().map(u => ({ id: u.id, label: u.name })),
    ]);

    readonly epicOptions = computed(() => [
        { id: null, label: '(все эпики)' },
        { id: FILTER_NONE, label: 'Без эпика' },
        ...(this.currentBoard()?.epics ?? [])
            .map(e => ({ id: e.id, label: `EPIC-${e.number} · ${e.title}` })),
    ]);

    /** Фильтрация + сортировка - те же правила, что во всех реализациях. */
    readonly visibleTasks = computed<TaskItem[]>(() => {
        let q = [...(this.currentBoard()?.tasks ?? [])];
        if (this.assigneeFilter() !== null)
            q = q.filter(t => this.assigneeFilter() === FILTER_NONE
                ? t.assigneeId === null
                : t.assigneeId === this.assigneeFilter());
        if (this.epicFilter() !== null)
            q = q.filter(t => this.epicFilter() === FILTER_NONE
                ? t.epicId === null
                : t.epicId === this.epicFilter());
        const needle = this.search().trim().toLowerCase();
        if (needle)
            q = q.filter(t => `${t.title} ${t.description}`.toLowerCase().includes(needle));
        return this.sortByPriority()
            ? q.sort((a, z) => priorityRank(a.priority) - priorityRank(z.priority) || a.order - z.order)
            : q.sort((a, z) => a.order - z.order);
    });

    readonly columns = computed(() =>
        Object.values(TaskState).map(state => ({
            state,
            title: STATE_TITLES[state],
            cards: this.visibleTasks().filter(t => t.state === state).map(t => this.toCard(t)),
        })));

    readonly epicsWithProgress = computed(() =>
        (this.currentBoard()?.epics ?? []).map((epic: Epic) => {
            const tasks = this.currentBoard()!.tasks.filter(t => t.epicId === epic.id);
            const done = tasks.filter(t => t.state === TaskState.Done).length;
            return {
                epic,
                key: `EPIC-${epic.number}`,
                total: tasks.length,
                done,
                progress: tasks.length === 0 ? 0 : done / tasks.length,
                label: `EPIC-${epic.number} · ${epic.title} (${done}/${tasks.length})`,
            };
        }));

    private toCard(t: TaskItem): CardVm {
        const board = this.currentBoard();
        return {
            task: t,
            key: `TASK-${t.number}`,
            assignee: this.users().find(u => u.id === t.assigneeId)?.name ?? 'не назначен',
            epicKey: t.epicId && board
                ? `EPIC-${board.epics.find(e => e.id === t.epicId)?.number ?? '?'}`
                : null,
            priorityLabel: PRIORITY_TITLES[t.priority],
            typeLabel: TYPE_TITLES[t.type],
            overdue: isOverdue(t),
        };
    }

    // ---------------- команды ----------------

    private setFlash(msg: string) {
        this.flash.set(`[${new Date().toLocaleTimeString()}] ${msg}`);
    }

    async createBoard(): Promise<void> {
        const name = await this.dialogs.ask<string>(
            { kind: 'prompt', title: 'Новая доска', label: 'Название доски:' });
        if (!name?.trim()) return;
        const b = this.store.createBoard(name.trim());
        this.currentBoardId.set(b.id);
        this.setFlash(`Доска «${b.name}» создана`);
    }

    async renameBoard(): Promise<void> {
        const board = this.currentBoard();
        if (!board) return;
        const name = await this.dialogs.ask<string>({
            kind: 'prompt', title: 'Переименовать доску',
            label: 'Новое название:', initial: board.name,
        });
        if (!name?.trim()) return;
        this.store.renameBoard(board.id, name.trim());
        this.setFlash('Доска переименована');
    }

    async deleteBoard(): Promise<void> {
        const board = this.currentBoard();
        if (!board) return;
        const ok = await this.dialogs.ask<boolean>(
            { kind: 'confirm', message: `Удалить доску «${board.name}» вместе со всеми задачами?` });
        if (!ok) return;
        this.store.deleteBoard(board.id);
        this.currentBoardId.set(this.store.firstBoard()?.id ?? null);   // gherkin: показать оставшуюся
        this.setFlash('Доска удалена');
    }

    async createEpic(): Promise<void> {
        const board = this.currentBoard();
        if (!board) return;
        const title = await this.dialogs.ask<string>(
            { kind: 'prompt', title: 'Новый эпик', label: 'Название эпика:' });
        if (!title?.trim()) return;
        const epic = this.store.addEpic(board.id, title.trim());
        if (epic) this.setFlash(`EPIC-${epic.number} создан`);
    }

    async deleteEpic(row: { key: string; epic: Epic; total: number }): Promise<void> {
        const board = this.currentBoard();
        if (!board || !row) return;
        const mode = await this.dialogs.ask<'detach' | 'cascade'>({
            kind: 'epicDelete', epicKey: row.key, epicTitle: row.epic.title, taskCount: row.total,
        });
        if (!mode) return;
        this.store.deleteEpic(board.id, row.epic.id, mode);
        this.setFlash(mode === 'cascade'
            ? `${row.key} удалён вместе с задачами`
            : `${row.key} удалён, задачи остались`);
    }

    seedTestEpic(): void {
        const board = this.currentBoard();
        if (!board) return;
        const epic = this.store.seedTestEpic(board.id);
        this.setFlash(epic ? `EPIC-${epic.number} с тестовыми задачами добавлен` : 'Не удалось создать эпик');
    }

    seedRandomTasks(): void {
        if (!this.currentBoard()) return;
        this.store.seedRandomTasks(this.currentBoard()!.id, 10);
        this.setFlash('Добавлено 10 случайных задач');
    }

    /**
     * Создание/редактирование задачи. Форма валидирует себя сама
     * (ModalsHostComponent); сюда приходит ГОТОВЫЙ результат или null.
     */
    async openTaskEditor(task: TaskItem | null, defaultState: TaskState = TaskState.ToDo): Promise<void> {
        const board = this.currentBoard();
        if (!board) return;

        const result = await this.dialogs.ask<TaskDialogResult>({
            kind: 'task',
            existing: task
                ? { title: task.title, description: task.description, assigneeId: task.assigneeId,
                    epicId: task.epicId, state: task.state, type: task.type,
                    priority: task.priority, deadline: task.deadline }
                : null,
            defaultState,
            users: this.store.users().map(u => ({ id: u.id, label: u.name })),
            epics: board.epics.map(e => ({ id: e.id, label: `EPIC-${e.number} · ${e.title}` })),
        });
        if (!result) return;                                     // отмена

        if (task) {
            this.store.updateTask(board.id, task.id, t => {
                t.title = result.title;
                t.description = result.description;
                t.assigneeId = result.assigneeId;
                t.epicId = result.epicId;
                t.state = result.state;
                t.type = result.type;
                t.priority = result.priority;
                t.deadline = result.deadline;
            });
            this.setFlash(`TASK-${task.number} сохранена`);
        } else {
            const created = this.store.addTask(board.id, result);
            if (created) this.setFlash(`TASK-${created.number} создана`);
        }
    }

    async deleteTask(card: CardVm): Promise<void> {
        const board = this.currentBoard();
        if (!board) return;
        const ok = await this.dialogs.ask<boolean>(
            { kind: 'confirm', message: `Удалить ${card.key} «${card.task.title}»?` });
        if (!ok) return;
        this.store.deleteTask(board.id, card.task.id);
        this.setFlash(`${card.key} удалена`);
    }

    moveTask(taskId: string, targetState: TaskState, targetIndex: number): void {
        const board = this.currentBoard();
        if (!board) return;
        this.store.moveTask(board.id, taskId, targetState, targetIndex);
    }

    resetFilters(): void {
        this.search.set('');
        this.assigneeFilter.set(null);
        this.epicFilter.set(null);
        this.sortByPriority.set(false);
    }

    exportJson(): void {
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const blob = new Blob([this.store.exportJson()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kanban-export-${stamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.setFlash('Данные экспортированы в JSON');
    }

    importJson(): void {
        const input = document.createElement('input');           // скрытый <input type=file>
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    this.store.importJson(String(reader.result));
                    this.currentBoardId.set(this.store.firstBoard()?.id ?? null);
                    this.setFlash('Импорт выполнен');
                } catch (err) {
                    this.setFlash(`Ошибка импорта: ${(err as Error).message}`);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    async resetAll(): Promise<void> {
        const word = await this.dialogs.ask<string>({
            kind: 'prompt', title: 'Подтверждение',
            label: 'Для полного сброса всех данных введите слово СБРОС:',
            confirmWord: 'СБРОС',
        });
        if (word !== 'СБРОС') { this.setFlash('Сброс отменён (нужно слово СБРОС)'); return; }
        this.store.resetAll();
        this.currentBoardId.set(null);
        this.setFlash('Все данные удалены');
    }
}
