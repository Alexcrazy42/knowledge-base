// ============================================================================
// KanbanStore - "Model". Порт InMemoryBoardStore из C# (через store.js Vue).
//
// КЛЮЧЕВОЕ ДЛЯ REACT: React не умеет наблюдать мутации - он сравнивает
// ССЫЛКИ. Поэтому стор хранит иммутабельный снапшот: каждая мутация
// пересоздаёт state (structuredClone + правки), затем уведомляет подписчиков.
// Компоненты читают состояние через useSyncExternalStore (use-kanban.ts).
//
// Сравните: в WinForms после мутации презентер вручную звал view.Reload(),
// во Vue reactive() разруливал сам, здесь - новый объект = новая ссылка.
// ============================================================================

import { loadJson, removeKey, saveJson } from '@/shared/lib';
import { makeTask, TaskState, Priority, WorkItemType } from '@/entities/task';
import type { Task, TaskSpec } from '@/entities/task';
import { makeUser } from '@/entities/user';
import type { User } from '@/entities/user';
import { makeBoard } from './types';
import type { Board } from './types';

export interface EpicDeleteMode {
    /** 'detach' - задачи остаются без эпика; 'cascade' - удаляются вместе. */
    kind: 'detach' | 'cascade';
}

/** Весь мир приложения. Ключ localStorage свой ('fsd-kanban.v1'), чтобы
 *  веб-версии на соседних портах не затирали данные друг друга:
 *  localStorage общий для всего origin localhost! */
const STORAGE_KEY = 'fsd-kanban.v1';

export interface KanbanState {
    boards: Board[];
    users: User[];
}

type TaskPatch = Partial<Omit<Task, 'id' | 'number' | 'createdAt'>>;

class KanbanStore {
    private _state: KanbanState = { boards: [], users: [] };
    private readonly listeners = new Set<() => void>();

    constructor() {
        this.#load();
    }

    // ---------------- подписка (контракт useSyncExternalStore) ----------------

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    get getState(): () => KanbanState {
        return () => this._state;
    }

    /** Все мутации идут через commit: клонируем -> правим -> уведомляем -> save. */
    #commit(mutate: (draft: KanbanState) => void): void {
        const draft = structuredClone(this._state);
        mutate(draft);
        this._state = draft;
        this.listeners.forEach(l => l());
        this.#save();
    }

    // ---------------- чтение ----------------

    findBoard(boardId: string | null): Board | null {
        return this._state.boards.find(b => b.id === boardId) ?? null;
    }

    firstBoard(): Board | null {
        return this._state.boards[0] ?? null;
    }

    get boards(): Board[] {
        return this._state.boards;
    }

    get users(): User[] {
        return this._state.users;
    }

    // ---------------- доски ----------------

    createBoard(name: string): Board {
        const board = makeBoard(name);
        this.#commit(s => s.boards.push(board));
        return board;
    }

    renameBoard(boardId: string, name: string): boolean {
        const b = this.findBoard(boardId);
        if (!b) return false;
        this.#commit(s => {
            (s.boards.find(x => x.id === boardId) as Board).name = name;
        });
        return true;
    }

    deleteBoard(boardId: string): boolean {
        const exists = this.findBoard(boardId);
        if (!exists) return false;
        this.#commit(s => {
            s.boards = s.boards.filter(b => b.id !== boardId);
        });
        return true;
    }

    // ---------------- задачи ----------------

    addTask(boardId: string, spec: TaskSpec): Task | null {
        const b = this.findBoard(boardId);
        if (!b) return null;
        // Читаем номер БЕЗ мутации живой ссылки (иначе двойной инкремент:
        // правка текущего состояния + правка черновика). Инкрементирует
        // только черновик внутри commit.
        const order = b.tasks.filter(t => t.state === spec.state).length;
        const task = makeTask(spec, b.nextTaskNumber, order);
        this.#commit(s => {
            const board = s.boards.find(x => x.id === boardId) as Board;
            board.nextTaskNumber += 1;
            board.tasks.push(task);
        });
        return task;
    }

    updateTask(boardId: string, taskId: string, patch: TaskPatch): boolean {
        const t = this.findBoard(boardId)?.tasks.find(x => x.id === taskId);
        if (!t) return false;
        this.#commit(s => {
            const task = (s.boards.find(x => x.id === boardId) as Board)
                .tasks.find(x => x.id === taskId) as Task;
            Object.assign(task, patch);
            task.updatedAt = new Date().toISOString();
        });
        return true;
    }

    deleteTask(boardId: string, taskId: string): boolean {
        const b = this.findBoard(boardId);
        if (!b?.tasks.some(x => x.id === taskId)) return false;
        this.#commit(s => {
            const board = s.boards.find(x => x.id === boardId) as Board;
            board.tasks = board.tasks.filter(t => t.id !== taskId);
        });
        return true;
    }

    /** Перенос между колонками с плотной перенумерацией orders (как в C#/Vue). */
    moveTask(boardId: string, taskId: string, targetState: Task['state'], targetIndex: number): boolean {
        const b = this.findBoard(boardId);
        const task = b?.tasks.find(x => x.id === taskId);
        if (!task) return false;

        this.#commit(s => {
            const board = s.boards.find(x => x.id === boardId) as Board;

            const source = board.tasks
                .filter(x => x.state === task.state && x.id !== taskId)
                .sort((a, z) => a.order - z.order);
            source.forEach((t, i) => { t.order = i; });

            const target = board.tasks
                .filter(x => x.state === targetState)
                .sort((a, z) => a.order - z.order);
            const idx = Math.max(0, Math.min(targetIndex, target.length));
            const moving = board.tasks.find(x => x.id === taskId) as Task;
            moving.state = targetState;
            target.splice(idx, 0, moving);
            target.forEach((t, i) => { t.order = i; });
        });
        return true;
    }

    // ---------------- эпики ----------------

    addEpic(boardId: string, title: string) {
        const b = this.findBoard(boardId);
        if (!b) return null;
        // Тот же принцип, что в addTask: читаем номер без мутации.
        const epic = { id: crypto.randomUUID(), number: b.nextEpicNumber, title };
        this.#commit(s => {
            const board = s.boards.find(x => x.id === boardId) as Board;
            board.nextEpicNumber += 1;
            board.epics.push(epic);
        });
        return epic;
    }

    /** mode: 'detach' | 'cascade' - те же режимы, что EpicDeleteMode в C#. */
    deleteEpic(boardId: string, epicId: string, mode: 'detach' | 'cascade'): boolean {
        const b = this.findBoard(boardId);
        if (!b || !b.epics.some(e => e.id === epicId)) return false;
        this.#commit(s => {
            const board = s.boards.find(x => x.id === boardId) as Board;
            board.epics = board.epics.filter(e => e.id !== epicId);
            if (mode === 'cascade') {
                board.tasks = board.tasks.filter(t => t.epicId !== epicId);
            } else {
                board.tasks.forEach(t => { if (t.epicId === epicId) t.epicId = null; });
            }
        });
        return true;
    }

    // ---------------- пользователи ----------------

    addUser(name: string): User {
        const u = makeUser(name);
        this.#commit(s => s.users.push(u));
        return u;
    }

    deleteUser(userId: string, reassignToUserId: string | null): boolean {
        if (!this._state.users.some(u => u.id === userId)) return false;
        this.#commit(s => {
            for (const b of s.boards) {
                for (const t of b.tasks) {
                    if (t.assigneeId === userId) t.assigneeId = reassignToUserId ?? null;
                }
            }
            s.users = s.users.filter(u => u.id !== userId);
        });
        return true;
    }

    // ---------------- сиды (gherkin Data Seeding) ----------------

    seedTestEpic(boardId: string) {
        const b = this.findBoard(boardId);
        if (!b) return null;
        const epic = this.addEpic(boardId, 'Тестовый эпик');
        if (!epic) return null;
        const titles = ['Настроить окружение', 'Написать тесты', 'Починить сборку',
            'Обновить зависимости', 'Провести код-ревью'];
        titles.forEach((title, i) => {
            this.addTask(boardId, {
                title: `${title} (${epic.number}.${i + 1})`,
                epicId: epic.id,
                state: i < 2 ? TaskState.Done : i === 2 ? TaskState.InProgress : TaskState.ToDo,
                priority: [Priority.High, Priority.Medium, Priority.Low][i % 3],
                type: WorkItemType.Task,
                assigneeId: this.users[i % Math.max(1, this.users.length)]?.id ?? null,
            });
        });
        return epic;
    }

    seedRandomTasks(boardId: string, count: number): void {
        const b = this.findBoard(boardId);
        if (!b) return;
        const titles = ['Спроектировать API', 'Добавить валидацию', 'Оптимизировать запрос',
            'Исправить вёрстку', 'Написать документацию', 'Настроить CI', 'Рефакторинг сервиса',
            'Добавить логирование', 'Закрыть уязвимость', 'Улучшить обработку ошибок'];
        const states = [TaskState.ToDo, TaskState.InProgress, TaskState.Done];
        const priorities = [Priority.High, Priority.Medium, Priority.Low];
        const types = [WorkItemType.Task, WorkItemType.Bug, WorkItemType.Story];

        for (let i = 0; i < count; i++) {
            const roll = Math.random();                     // 40/30/30 как в DataSeeder
            const state = roll < 0.4 ? states[0] : roll < 0.7 ? states[1] : states[2];
            const withUser = Math.random() < 0.8 && this.users.length > 0;
            const deadlineRoll = Math.random();
            const deadline = deadlineRoll < 0.3 ? null :
                new Date(Date.now() + (deadlineRoll < 0.6 ? -3 : 5 + Math.random() * 10) * 864e5)
                    .toISOString().slice(0, 10);

            // Свежий номер на каждой итерации: addTask заменяет снапшот стора.
            const freshBoard = this.findBoard(boardId) as Board;
            this.addTask(boardId, {
                title: `${titles[Math.floor(Math.random() * titles.length)]} #${freshBoard.nextTaskNumber}`,
                state,
                priority: priorities[Math.floor(Math.random() * priorities.length)],
                type: types[Math.floor(Math.random() * types.length)],
                assigneeId: withUser ? this.users[Math.floor(Math.random() * this.users.length)].id : null,
                epicId: b.epics.length && Math.random() < 0.4
                    ? b.epics[Math.floor(Math.random() * b.epics.length)].id : null,
                deadline,
            });
        }
    }

    // ---------------- сброс и персистентность (gherkin Persistence) ----------------

    resetAll(): void {
        this._state = { boards: [], users: [] };
        this.listeners.forEach(l => l());
        removeKey(STORAGE_KEY);
    }

    exportJson(): string {
        return JSON.stringify({ version: 1, boards: this.boards, users: this.users }, null, 2);
    }

    importJson(text: string): void {
        const data = JSON.parse(text);                  // бросит при битом JSON - ловит фича
        if (!Array.isArray(data.boards)) throw new Error('Ожидается поле boards');
        this._state = { boards: data.boards, users: data.users ?? [] };
        this.listeners.forEach(l => l());
        this.#save();
    }

    #save(): void {
        saveJson(STORAGE_KEY, { version: 1, boards: this._state.boards, users: this._state.users });
    }

    #load(): void {
        const data = loadJson<KanbanState>(STORAGE_KEY);
        if (!data) return;
        this._state = {
            boards: Array.isArray(data.boards) ? data.boards : [],
            users: Array.isArray(data.users) ? data.users : [],
        };
    }
}

/** Единственный экземпляр стора на приложение (аналог singleton-регистрации). */
export const kanbanStore = new KanbanStore();
