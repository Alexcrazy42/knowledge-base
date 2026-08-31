// ============================================================================
// BoardPresenter - "P" в MVP. JS-порт C#-презентера, логика 1:1.
//
// Знает только: view (объект с методами контракта), store (Model),
// фабрику диалога задачи. Ноль обращений к DOM - поэтому вся логика
// экрана проверяется автотестом с фейковой вьюхой (см. README).
//
// Отличие от веб-MVC: презентер ЖИВЁТ столько же, сколько страница,
// и держит состояние (_currentBoardId) в обычном поле - как в WinForms.
// ============================================================================

'use strict';

class BoardPresenter {
    constructor(view, store, { openUsersScreen, taskEditFactory }) {
        this.view = view;
        this.store = store;
        this.openUsersScreen = openUsersScreen;
        this.taskEditFactory = taskEditFactory ??
            (() => { throw new Error('Фабрика диалога задачи не подключена'); });
        this.currentBoardId = null;
    }

    /** Точка входа: подписаться на события view + первый рендер (аналог Run()). */
    run() {
        this.view.bindHandlers({
            createBoard: () => this.createBoard(),
            renameBoard: () => this.renameBoard(),
            deleteBoard: () => this.deleteBoard(),
            switchBoard: id => this.switchTo(id),
            createTask: state => this.openTaskDialog(null, state),
            openTask: id => this.openTaskDialog(id, null),
            deleteTask: id => this.deleteTask(id),
            taskMoved: (taskId, state, index) => this.moveTask(taskId, state, index),
            applyFilters: () => this.reload(),
            resetFilters: () => {
                this.view.resetFilters(assigneeFilterOptions(this.store.users), this.epicOptions());
                this.reload();
            },
            seedEpic: () => this.seedEpic(),
            seedTasks: () => this.seedTasks(),
            createEpic: () => this.createEpic(),
            deleteEpic: id => this.deleteEpic(id),
            exportData: () => this.exportData(),
            importData: text => this.importData(text),
            resetAll: () => this.resetAll(),
            openUsers: () => this.openUsersScreen()
        });

        this.currentBoardId = this.store.firstBoard()?.id ?? null;
        this.view.resetFilters(assigneeFilterOptions(this.store.users), this.epicOptions());
        this.reload();
        this.view.flash(this.currentBoardId
            ? `Открыта доска «${this.#board().name}»`
            : 'Создайте первую доску');
    }

    /** Внешний сигнал "данные изменились" (аналог ExternalRefresh). */
    externalRefresh() { this.reload(); }

    // ---------------- главный рендер (SSR-стиль: всё заново) ----------------

    reload() {
        const board = this.#board();
        this.view.renderBoards(
            this.store.boards.map(b => ({ id: b.id, name: b.name })),
            this.currentBoardId);

        if (!board) {
            this.view.renderColumns(emptyColumns());
            this.view.renderEpics([]);
            this.view.showTable([]);
            return;
        }

        const criteria = this.view.readFilterCriteria();
        const visible = filterAndSort(board.tasks, criteria);

        this.view.renderColumns(Object.values(TaskState).map(state => ({
            state,
            title: stateTitle(state),
            cards: visible.filter(t => t.state === state).map(t => this.toCard(board, t))
        })));

        // прогресс эпиков - по ВСЕМ задачам доски, не по отфильтрованным
        this.view.renderEpics(board.epics.map(e => ({
            id: e.id,
            key: `EPIC-${e.number}`,
            title: e.title,
            total: board.tasks.filter(t => t.epicId === e.id).length,
            done: board.tasks.filter(t => t.epicId === e.id && t.state === TaskState.Done).length
        })));

        this.view.showTable(visible.map(t => ({
            key: `TASK-${t.number}`,
            title: t.title,
            state: stateTitle(t.state),
            priority: priorityTitle(t.priority),
            assignee: this.store.users.find(u => u.id === t.assigneeId)?.name ?? '—',
            deadline: t.deadline ?? '—'
        })));
    }

    toCard(board, t) {
        const today = new Date().toISOString().slice(0, 10);
        return {
            id: t.id,
            key: `TASK-${t.number}`,
            title: t.title,
            typeName: typeTitle(t.type),
            priorityName: priorityTitle(t.priority),
            priorityClass: t.priority,                              // high|medium|low -> CSS
            assignee: this.store.users.find(u => u.id === t.assigneeId)?.name ?? null,
            deadlineText: t.deadline ? `⏰ ${formatDate(t.deadline)}` : null,
            overdue: !!t.deadline && t.deadline < today && t.state !== TaskState.Done,
            epicKey: t.epicId ? `EPIC-${board.epics.find(e => e.id === t.epicId)?.number}` : null
        };
    }

    #board() { return this.currentBoardId ? this.store.findBoard(this.currentBoardId) : null; }

    epicOptions() {
        const board = this.#board();
        if (!board) return [];
        return [{ id: FILTER_NONE, label: 'Без эпика' },
                ...board.epics.map(e => ({ id: e.id, label: `EPIC-${e.number} · ${e.title}` }))];
    }

    // ---------------- обработчики досок ----------------

    async createBoard() {
        const name = await this.view.prompt('Новая доска', 'Название доски:');
        if (!name?.trim()) return;
        const board = this.store.createBoard(name.trim());
        this.currentBoardId = board.id;                             // gherkin: сразу переключаемся
        this.reload();
        this.view.flash(`Доска «${board.name}» создана`);
    }

    async renameBoard() {
        const board = this.#board();
        if (!board) return;
        const name = await this.view.prompt('Переименовать доску', 'Новое название:', board.name);
        if (!name?.trim()) return;
        this.store.renameBoard(board.id, name.trim());
        this.reload();
        this.view.flash('Доска переименована');
    }

    async deleteBoard() {
        const board = this.#board();
        if (!board) return;
        if (!(await this.view.confirmBox(`Удалить доску «${board.name}» вместе со всеми задачами?`))) return;
        this.store.deleteBoard(board.id);
        this.currentBoardId = this.store.firstBoard()?.id ?? null;  // gherkin: показать оставшуюся
        this.reload();
        this.view.flash('Доска удалена');
    }

    switchTo(id) {
        if (this.currentBoardId === id) return;                     // эхо перерисовки списка
        this.currentBoardId = id;
        this.reload();
    }

    // ---------------- диалог задачи (цикл валидации как в C#) ----------------

    async openTaskDialog(taskId, defaultState) {
        const board = this.#board();
        if (!board) return;

        const existing = taskId ? board.tasks.find(t => t.id === taskId) : null;
        const data = await this.taskEditFactory()({
            title: existing ? `Редактирование TASK-${existing.number}` : 'Новая задача',
            assignees: this.store.users.map(u => ({ id: u.id, label: u.name })),
            epics: board.epics.map(e => ({ id: e.id, label: `EPIC-${e.number} · ${e.title}` })),
            task: existing ? {
                title: existing.title, description: existing.description,
                assigneeId: existing.assigneeId, epicId: existing.epicId,
                state: existing.state, type: existing.type,
                priority: existing.priority, deadline: existing.deadline
            } : null,
            defaultState: defaultState ?? TaskState.ToDo
        });
        if (!data) return;                                          // отмена

        if (!existing) {
            const created = this.store.addTask(board.id, data);
            this.reload();
            this.view.flash(created ? `TASK-${created.number} создана` : 'Не удалось создать задачу');
        } else {
            this.store.updateTask(board.id, existing.id, t => Object.assign(t, data));
            this.reload();
            this.view.flash(`TASK-${existing.number} сохранена`);
        }
    }

    async deleteTask(taskId) {
        const board = this.#board();
        const task = board?.tasks.find(t => t.id === taskId);
        if (!task) return;
        if (!(await this.view.confirmBox(`Удалить TASK-${task.number} «${task.title}»?`))) return;
        this.store.deleteTask(board.id, task.id);
        this.reload();
        this.view.flash(`TASK-${task.number} удалена`);
    }

    moveTask(taskId, targetState, index) {
        const board = this.#board();
        if (!board) return;
        this.store.moveTask(board.id, taskId, targetState, index);  // инварианты Order внутри стора
        this.reload();
    }

    // ---------------- эпики ----------------

    async createEpic() {
        const board = this.#board();
        if (!board) return;
        const title = await this.view.prompt('Новый эпик', 'Название эпика:');
        if (!title?.trim()) return;
        const epic = this.store.addEpic(board.id, title.trim(), '');
        this.reload();
        this.view.flash(epic ? `EPIC-${epic.number} создан` : 'Не удалось создать эпик');
    }

    async deleteEpic(epicId) {
        const board = this.#board();
        const epic = board?.epics.find(e => e.id === epicId);
        if (!epic) return;

        const count = board.tasks.filter(t => t.epicId === epicId).length;
        const mode = await this.view.chooseEpicDeleteMode(`EPIC-${epic.number}`, epic.title, count);
        if (!mode) return;
        this.store.deleteEpic(board.id, epicId, mode);
        this.reload();
        this.view.flash(mode === 'cascade'
            ? `EPIC-${epic.number} удалён вместе с задачами`
            : `EPIC-${epic.number} удалён, задачи остались`);
    }

    async seedEpic() {
        const board = this.#board();
        if (!board) return;
        const epic = this.store.seedTestEpic(board.id);
        this.reload();
        this.view.flash(epic ? `EPIC-${epic.number} с тестовыми задачами добавлен` : 'Не удалось создать эпик');
    }

    seedTasks() {
        const board = this.#board();
        if (!board) return;
        this.store.seedRandomTasks(board.id, 10);
        this.reload();
        this.view.flash('Добавлено 10 случайных задач');
    }

    // ---------------- персистентность ----------------

    exportData() {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        this.view.saveFile(`kanban-export-${stamp}.json`, this.store.exportJson());
        this.view.flash('Данные экспортированы в JSON');
    }

    async importData(text) {
        try {
            this.store.importJson(text);
            this.currentBoardId = this.store.firstBoard()?.id ?? null;
            this.view.resetFilters(assigneeFilterOptions(this.store.users), this.epicOptions());
            this.reload();
            this.view.flash('Импорт выполнен');
        } catch (ex) {
            this.view.flash(`Ошибка импорта: ${ex.message}`);       // битый JSON - штатная ситуация
        }
    }

    async resetAll() {
        const word = await this.view.askConfirmWord('полного сброса всех данных');
        if (word !== 'СБРОС') {                                     // точное слово, регистр важен
            this.view.flash('Сброс отменён (нужно слово СБРОС)');
            return;
        }
        this.store.resetAll();
        this.currentBoardId = null;
        this.view.resetFilters(assigneeFilterOptions(this.store.users), []);
        this.reload();
        this.view.flash('Все данные удалены');
    }
}

// ---------------- общие правила фильтрации (те же, что в вебе) ----------------
// Спецзначение FILTER_NONE ("без исполнителя/эпика") объявлено в models.js.

function assigneeFilterOptions(users) {
    return [{ id: FILTER_NONE, label: 'Без исполнителя' },
            ...users.map(u => ({ id: u.id, label: u.name }))];
}

function filterAndSort(tasks, c) {
    let q = [...tasks];
    if (c.assigneeId)
        q = q.filter(t => c.assigneeId === FILTER_NONE ? !t.assigneeId : t.assigneeId === c.assigneeId);
    if (c.epicId)
        q = q.filter(t => c.epicId === FILTER_NONE ? !t.epicId : t.epicId === c.epicId);
    if (c.searchText)
        q = q.filter(t => (t.title + ' ' + t.description)
            .toLowerCase().includes(c.searchText.toLowerCase()));

    const rank = p => p === Priority.High ? 0 : p === Priority.Medium ? 1 : 2;
    return c.sortMode === 'priority'
        ? q.sort((a, z) => rank(a.priority) - rank(z.priority) || a.order - z.order)
        : q.sort((a, z) => a.order - z.order);
}

function emptyColumns() {
    return Object.values(TaskState).map(state => ({ state, title: stateTitle(state), cards: [] }));
}

function formatDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
}
