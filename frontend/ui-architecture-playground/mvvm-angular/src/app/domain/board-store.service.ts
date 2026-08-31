// ============================================================================
// BoardStoreService - "Model". Angular-порт InMemoryBoardStore.
//
// Состояние - два signal'а. Любая мутация через .update()/.mutate()
// автоматически перерисовывает все computed/шаблоны, которые их читают -
// в этом смысл MVVM-реактивности (в MVP после мутации звали view.ShowX()).
//
// Сервис в Angular = заменяемая зависимость: для тестов ViewModel можно
// подсунуть фейковый стор (как IBoardStore в C#).
// ============================================================================

import { Injectable, signal } from '@angular/core';
import {
    Board, Epic, TaskItem, User,
    makeBoard, makeTask, makeUser,
    NewTaskSpec, Priority, TaskState, WorkItemType,
} from './models';

const STORAGE_KEY = 'kanban-angular-mvvm-v1';

// ВАЖНО: данные читаются из localStorage на уровне МОДУЛЯ, до создания
// экземпляра сервиса. Иначе currentBoardId в KanbanViewModel (field
// initializer!) увидел бы пустой стор: после F5 доска «не выбрана».
function parseInitialStorage(): { boards: Board[]; users: User[] } {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { boards: [], users: [] };
        const data = JSON.parse(raw);
        return {
            boards: Array.isArray(data.boards) ? data.boards : [],
            users: Array.isArray(data.users) ? data.users : [],
        };
    } catch {
        return { boards: [], users: [] };
    }
}

const INITIAL_STORAGE = parseInitialStorage();

@Injectable({ providedIn: 'root' })
export class BoardStoreService {
    readonly boards = signal<Board[]>(INITIAL_STORAGE.boards);
    readonly users = signal<User[]>(INITIAL_STORAGE.users);

    // ---------------- чтение ----------------

    findBoard(boardId: string | null): Board | null {
        return boardId ? this.boards().find(b => b.id === boardId) ?? null : null;
    }

    firstBoard(): Board | null {
        return this.boards()[0] ?? null;
    }

    // ---------------- доски ----------------

    createBoard(name: string): Board {
        const board = makeBoard(name);
        this.boards.update(list => [...list, board]);
        this.#save();
        return board;
    }

    renameBoard(boardId: string, name: string): void {
        this.#mutateBoard(boardId, b => { b.name = name; });
    }

    deleteBoard(boardId: string): void {
        this.boards.update(list => list.filter(b => b.id !== boardId));
        this.#save();
    }

    // ---------------- задачи ----------------

    addTask(boardId: string, spec: NewTaskSpec): TaskItem | null {
        const board = this.findBoard(boardId);
        if (!board) return null;
        const order = board.tasks.filter(t => t.state === spec.state).length;
        const task = makeTask(spec, board.nextTaskNumber++, order);
        board.tasks.push(task);                       // nextTaskNumber инкрементирован выше
        this.#touch();
        return task;
    }

    updateTask(boardId: string, taskId: string, mutate: (t: TaskItem) => void): void {
        const t = this.findBoard(boardId)?.tasks.find(x => x.id === taskId);
        if (!t) return;
        mutate(t);
        t.updatedAt = new Date().toISOString();
        this.#touch();
    }

    deleteTask(boardId: string, taskId: string): void {
        const board = this.findBoard(boardId);
        if (!board) return;
        board.tasks = board.tasks.filter(t => t.id !== taskId);
        this.#touch();
    }

    /** Перенос между колонками с плотной перенумерацией orders (как везде). */
    moveTask(boardId: string, taskId: string, targetState: TaskState, targetIndex: number): void {
        const board = this.findBoard(boardId);
        const task = board?.tasks.find(t => t.id === taskId);
        if (!board || !task || task.state === targetState) return;

        const source = board.tasks
            .filter(t => t.state === task!.state && t.id !== taskId)
            .sort((a, z) => a.order - z.order);
        source.forEach((t, i) => t.order = i);

        const target = board.tasks
            .filter(t => t.state === targetState)
            .sort((a, z) => a.order - z.order);
        const idx = Math.max(0, Math.min(targetIndex, target.length));
        task.state = targetState;
        target.splice(idx, 0, task);
        target.forEach((t, i) => t.order = i);

        // orders мутировали "на месте" -> уведомляем подписчиков явно
        this.#touch();
    }

    // ---------------- эпики ----------------

    addEpic(boardId: string, title: string): Epic | null {
        const board = this.findBoard(boardId);
        if (!board) return null;
        const epic: Epic = { id: crypto.randomUUID(), number: board.nextEpicNumber++, title };
        board.epics.push(epic);
        this.#touch();
        return epic;
    }

    /** mode: 'detach' | 'cascade' - те же режимы, что EpicDeleteMode в C#. */
    deleteEpic(boardId: string, epicId: string, mode: 'detach' | 'cascade'): void {
        const board = this.findBoard(boardId);
        if (!board) return;
        board.epics = board.epics.filter(e => e.id !== epicId);
        if (mode === 'cascade') board.tasks = board.tasks.filter(t => t.epicId !== epicId);
        else board.tasks.forEach(t => { if (t.epicId === epicId) t.epicId = null; });
        this.#touch();
    }

    // ---------------- пользователи ----------------

    addUser(name: string): User {
        const u = makeUser(name);
        this.users.update(list => [...list, u]);
        this.#save();
        return u;
    }

    deleteUser(userId: string, reassignToUserId: string | null): void {
        for (const b of this.boards())
            for (const t of b.tasks)
                if (t.assigneeId === userId) t.assigneeId = reassignToUserId;

        this.users.update(list => list.filter(u => u.id !== userId));
        this.#touch();
    }

    // ---------------- сиды ----------------

    seedTestEpic(boardId: string): Epic | null {
        const board = this.findBoard(boardId);
        if (!board) return null;
        const epic = this.addEpic(boardId, 'Тестовый эпик');
        if (!epic) return null;
        const titles = ['Настроить окружение', 'Написать тесты', 'Починить сборку',
            'Обновить зависимости', 'Провести код-ревью'];
        titles.forEach((title, i) => {
            this.addTask(boardId, {
                title: `${title} (${epic.number}.${i + 1})`,
                epicId: epic.id,
                state: i < 2 ? TaskState.Done : i === 2 ? TaskState.InProgress : TaskState.ToDo,
                priority: ([Priority.High, Priority.Medium, Priority.Low] as const)[i % 3],
                type: WorkItemType.Task,
                assigneeId: this.users()[i % Math.max(1, this.users().length)]?.id ?? null,
            });
        });
        return epic;
    }

    seedRandomTasks(boardId: string, count: number): void {
        const board = this.findBoard(boardId);
        if (!board) return;
        const titles = ['Спроектировать API', 'Добавить валидацию', 'Оптимизировать запрос',
            'Исправить вёрстку', 'Написать документацию', 'Настроить CI', 'Рефакторинг сервиса',
            'Добавить логирование', 'Закрыть уязвимость', 'Улучшить обработку ошибок'];
        const states = [TaskState.ToDo, TaskState.InProgress, TaskState.Done];
        const priorities = [Priority.High, Priority.Medium, Priority.Low];
        const types = [WorkItemType.Task, WorkItemType.Bug, WorkItemType.Story];
        const users = this.users();

        for (let i = 0; i < count; i++) {
            const roll = Math.random();                 // 40/30/30 как в DataSeeder
            const state = roll < 0.4 ? states[0] : roll < 0.7 ? states[1] : states[2];
            const deadlineRoll = Math.random();
            const deadline = deadlineRoll < 0.3 ? null :
                new Date(Date.now() + (deadlineRoll < 0.6 ? -3 : 5 + Math.random() * 10) * 864e5)
                    .toISOString().slice(0, 10);

            this.addTask(boardId, {
                title: `${titles[Math.floor(Math.random() * titles.length)]} #${board.nextTaskNumber}`,
                state,
                priority: priorities[Math.floor(Math.random() * priorities.length)],
                type: types[Math.floor(Math.random() * types.length)],
                assigneeId: users.length && Math.random() < 0.8
                    ? users[Math.floor(Math.random() * users.length)].id : null,
                epicId: board.epics.length && Math.random() < 0.4
                    ? board.epics[Math.floor(Math.random() * board.epics.length)].id : null,
                deadline,
            });
        }
    }

    // ---------------- сброс и персистентность ----------------

    resetAll(): void {
        this.boards.set([]);
        this.users.set([]);
        localStorage.removeItem(STORAGE_KEY);
    }

    exportJson(): string {
        return JSON.stringify({ version: 1, boards: this.boards(), users: this.users() }, null, 2);
    }

    importJson(text: string): void {
        const data = JSON.parse(text);
        if (!Array.isArray(data?.boards)) throw new Error('Ожидается поле boards');
        this.boards.set(data.boards);
        this.users.set(data.users ?? []);
        this.#save();
    }

    // ---------------- служебное ----------------

    /** Явное уведомление после мутаций "внутри" объектов (signal-версия #save+refresh). */
    #touch() {
        // ВАЖНО (Angular-ловушка №2): сигналы сравнивают зависимости ПО ССЫЛКЕ
        // и не следят за глубокой мутацией. Мы выше мутируем объекты досок
        // (tasks.push и т.п.), поэтому одного нового массива мало: computed
        // вроде currentBoard() -> columns() увидит ТУ ЖЕ ссылку доски и вернёт
        // закэшированный результат - канбан «замрёт». Отдаём и новые ссылки
        // самих досок (поверхностная копия достаточна).
        this.boards.update(list => list.map(b => ({ ...b })));
        this.#save();
    }

    #mutateBoard(boardId: string, mutate: (b: Board) => void): void {
        const board = this.findBoard(boardId);
        if (!board) return;
        mutate(board);
        this.#touch();
    }

    #save() {
        try { localStorage.setItem(STORAGE_KEY, this.exportJson()); } catch { /* приватный режим */ }
    }
}
