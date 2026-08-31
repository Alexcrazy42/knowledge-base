// ============================================================================
// BoardStore - "Model" в терминах MVP. JS-порт IBoardStore/InMemoryBoardStore.
//
// ЕДИНСТВЕННАЯ точка входа UI в данные. Презентеры знают только этот класс
// (в JS - не интерфейс, а просто объект с методами; подмена = передать другой).
//
// Бонус веб-версии: автосохранение в localStorage после каждой мутации -
// иначе F5 стирал бы всё. Экспорт/импорт JSON (gherkin Persistence) остаётся.
// ============================================================================

'use strict';

class BoardStore {
    constructor() {
        this.boards = [];   // Board { id, name, epics[], tasks[], nextTaskNumber, nextEpicNumber }
        this.users = [];    // User  { id, name }
        this.#load();
    }

    // ---------------- чтение ----------------

    findBoard(boardId) { return this.boards.find(b => b.id === boardId) ?? null; }
    firstBoard() { return this.boards[0] ?? null; }

    countTasksAssignedTo(userId) {
        return this.boards.reduce((n, b) =>
            n + b.tasks.filter(t => t.assigneeId === userId).length, 0);
    }

    // ---------------- доски ----------------

    createBoard(name) {
        const board = makeBoard(name);
        this.boards.push(board);
        this.#save();
        return board;
    }

    renameBoard(boardId, name) {
        const b = this.findBoard(boardId);
        if (!b) return false;
        b.name = name;
        this.#save();
        return true;
    }

    deleteBoard(boardId) {
        const i = this.boards.findIndex(b => b.id === boardId);
        if (i < 0) return false;
        this.boards.splice(i, 1);
        this.#save();
        return true;
    }

    // ---------------- задачи ----------------

    addTask(boardId, spec) {
        const b = this.findBoard(boardId);
        if (!b) return null;
        // Order = в конец своей колонки; number - глобальный счётчик доски -> TASK-N
        const order = b.tasks.filter(t => t.state === spec.state).length;
        const task = makeTask(spec, b.nextTaskNumber++, order);
        b.tasks.push(task);
        this.#save();
        return task;
    }

    /** Точечное изменение: мутатор получает задачу, стор штампует updatedAt. */
    updateTask(boardId, taskId, mutate) {
        const t = this.findBoard(boardId)?.tasks.find(x => x.id === taskId);
        if (!t) return false;
        mutate(t);
        t.updatedAt = new Date().toISOString();
        this.#save();
        return true;
    }

    deleteTask(boardId, taskId) {
        const b = this.findBoard(boardId);
        const i = b?.tasks.findIndex(x => x.id === taskId) ?? -1;
        if (i < 0) return false;
        b.tasks.splice(i, 1);
        this.#save();
        return true;
    }

    /**
     * DnD: перенос задачи в колонку targetState на позицию targetIndex.
     * Инвариант: orders внутри каждой колонки - плотная нумерация 0..n-1.
     */
    moveTask(boardId, taskId, targetState, targetIndex) {
        const b = this.findBoard(boardId);
        const task = b?.tasks.find(x => x.id === taskId);
        if (!task) return false;

        // вынимаем из исходной колонки и уплотняем её orders
        const source = b.tasks.filter(x => x.state === task.state && x.id !== taskId)
            .sort((a, z) => a.order - z.order);
        source.forEach((t, i) => t.order = i);

        // вставляем в целевую с ограничением индекса
        const target = b.tasks.filter(x => x.state === targetState)
            .sort((a, z) => a.order - z.order);
        const idx = Math.max(0, Math.min(targetIndex, target.length));
        task.state = targetState;
        target.splice(idx, 0, task);
        target.forEach((t, i) => t.order = i);

        this.#save();
        return true;
    }

    // ---------------- эпики ----------------

    addEpic(boardId, title, description) {
        const b = this.findBoard(boardId);
        if (!b) return null;
        const epic = { id: uid(), number: b.nextEpicNumber++, title, description: description ?? '' };
        b.epics.push(epic);
        this.#save();
        return epic;
    }

    /**
     * mode: 'detach' - задачи остаются без эпика;
     *       'cascade' - задачи удаляются вместе с эпиком (gherkin-сценарий).
     */
    deleteEpic(boardId, epicId, mode) {
        const b = this.findBoard(boardId);
        if (!b || !b.epics.some(e => e.id === epicId)) return false;
        b.epics = b.epics.filter(e => e.id !== epicId);
        if (mode === 'cascade') b.tasks = b.tasks.filter(t => t.epicId !== epicId);
        else b.tasks.forEach(t => { if (t.epicId === epicId) t.epicId = null; });
        this.#save();
        return true;
    }

    // ---------------- пользователи ----------------

    addUser(name) {
        const u = makeUser(name);
        this.users.push(u);
        this.#save();
        return u;
    }

    deleteUser(userId, reassignToUserId) {
        if (!this.users.some(u => u.id === userId)) return false;
        for (const b of this.boards)
            for (const t of b.tasks)
                if (t.assigneeId === userId) t.assigneeId = reassignToUserId ?? null;
        this.users = this.users.filter(u => u.id !== userId);
        this.#save();
        return true;
    }

    // ---------------- сиды (DataSeeder) ----------------

    seedTestEpic(boardId) {
        const b = this.findBoard(boardId);
        if (!b) return null;
        const epic = this.addEpic(boardId, 'Тестовый эпик', 'Создан кнопкой "+ Тестовый эпик"');
        const titles = ['Настроить окружение', 'Написать тесты', 'Починить сборку',
            'Обновить зависимости', 'Провести код-ревью'];
        titles.forEach((title, i) => {
            this.addTask(boardId, {
                title: `${title} (${epic.number}.${i + 1})`,
                epicId: epic.id,
                state: i < 2 ? TaskState.Done : i === 2 ? TaskState.InProgress : TaskState.ToDo,
                priority: [Priority.High, Priority.Medium, Priority.Low][i % 3],
                type: WorkItemType.Task,
                assigneeId: this.users[i % Math.max(1, this.users.length)]?.id ?? null
            });
        });
        return epic;
    }

    seedRandomTasks(boardId, count) {
        const b = this.findBoard(boardId);
        if (!b) return;
        const titles = ['Спроектировать API', 'Добавить валидацию', 'Оптимизировать запрос',
            'Исправить вёрстку', 'Написать документацию', 'Настроить CI', 'Рефакторинг сервиса',
            'Добавить логирование', 'Закрыть уязвимость', 'Улучшить обработку ошибок'];
        const states = [TaskState.ToDo, TaskState.InProgress, TaskState.Done];
        const priorities = [Priority.High, Priority.Medium, Priority.Low];
        const types = [WorkItemType.Task, WorkItemType.Bug, WorkItemType.Story];

        for (let i = 0; i < count; i++) {
            const roll = Math.random();                       // распределение 40/30/30 как в DataSeeder
            const state = roll < 0.4 ? states[0] : roll < 0.7 ? states[1] : states[2];
            const withUser = Math.random() < 0.8 && this.users.length > 0;
            const deadlineRoll = Math.random();
            const deadline = deadlineRoll < 0.3 ? null :
                new Date(Date.now() + (deadlineRoll < 0.6 ? -3 : 5 + Math.random() * 10) * 864e5)
                    .toISOString().slice(0, 10);              // треть дедлайнов в прошлом -> overdue виден

            this.addTask(boardId, {
                title: `${titles[Math.floor(Math.random() * titles.length)]} #${b.nextTaskNumber}`,
                state,
                priority: priorities[Math.floor(Math.random() * priorities.length)],
                type: types[Math.floor(Math.random() * types.length)],
                assigneeId: withUser ? this.users[Math.floor(Math.random() * this.users.length)].id : null,
                epicId: b.epics.length && Math.random() < 0.4
                    ? b.epics[Math.floor(Math.random() * b.epics.length)].id : null,
                deadline
            });
        }
    }

    // ---------------- сброс и персистентность ----------------

    resetAll() {
        this.boards = [];
        this.users = [];
        localStorage.removeItem(STORAGE_KEY);                 // gherkin: полное очищение
    }

    exportJson() {
        return JSON.stringify({ version: 1, boards: this.boards, users: this.users }, null, 2);
    }

    importJson(text) {
        const data = JSON.parse(text);                        // бросит исключение при битом JSON - ловит презентер
        if (!Array.isArray(data.boards)) throw new Error('Ожидается поле boards');
        this.boards = data.boards;
        this.users = data.users ?? [];
        this.#save();
    }

    // ---------------- localStorage ----------------

    #save() {
        try { localStorage.setItem(STORAGE_KEY, this.exportJson()); } catch { /* приватный режим и т.п. */ }
    }

    #load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            this.boards = Array.isArray(data.boards) ? data.boards : [];
            this.users = Array.isArray(data.users) ? data.users : [];
        } catch { this.boards = []; this.users = []; }
    }
}

const STORAGE_KEY = 'kanban-vanillajs-mvp-v1';
