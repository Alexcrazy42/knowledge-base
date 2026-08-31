// ============================================================================
// BoardView - ПАССИВНАЯ вьюха главного экрана (JS-порт IBoardView + BoardForm).
//
// Контракт (в JS интерфейса нет - он документирован и соблюдается дисциплиной):
//   вывод:    renderBoards(list, currentId), renderColumns(columns), renderEpics(rows),
//             showTable(rows), resetFilters(assignees, epics), flash(msg)
//   чтение:   readFilterCriteria() -> {assigneeId, epicId, searchText, sortMode}
//   диалоги:  prompt(), confirmBox(), askConfirmWord(), chooseEpicDeleteMode(),
//             saveFile(), openJsonFile()
//   события:  bindHandlers({...}) - презентер передаёт функции-обработчики ОДИН раз
//
// Здесь ТОЛЬКО DOM: найти контрол -> перерисовать / навесить обработчик,
// который тупо вызывает handler. Никаких обращений к store.
// ============================================================================

'use strict';

class BoardView {
    constructor(root) {
        this.root = root;
        this.handlers = {};
        this.currentBoardId = null;

        // кэш ссылок на статические элементы из index.html
        this.$ = sel => root.querySelector(sel);

        this.#bindStaticEvents();
    }

    // ---------------- регистрация обработчиков (презентер вызывает один раз) ----------------

    bindHandlers(handlers) {
        // handlers: { createBoard, renameBoard, deleteBoard, switchBoard(id),
        //             createTask(state), openTask(id), deleteTask(id), taskMoved(taskId,state,index),
        //             applyFilters, resetFilters, seedEpic, seedTasks, createEpic, deleteEpic(id),
        //             exportData, importData(text), resetAll, openUsers }
        this.handlers = handlers;
    }

    #emit(name, ...args) { this.handlers[name]?.(...args); }

    #bindStaticEvents() {
        this.$('#btn-new-board').addEventListener('click', () => this.#emit('createBoard'));
        this.$('#btn-rename-board').addEventListener('click', () => this.#emit('renameBoard'));
        this.$('#btn-delete-board').addEventListener('click', () => this.#emit('deleteBoard'));
        this.$('#btn-users').addEventListener('click', () => this.#emit('openUsers'));
        this.$('#boards-select').addEventListener('change', e => this.#emit('switchBoard', e.target.value));

        this.$('#btn-seed-epic').addEventListener('click', () => this.#emit('seedEpic'));
        this.$('#btn-seed-tasks').addEventListener('click', () => this.#emit('seedTasks'));
        this.$('#btn-add-epic').addEventListener('click', () => this.#emit('createEpic'));
        this.$('#btn-delete-epic').addEventListener('click', () => {
            const id = this.$('#epics-list').selectedId;          // хранится при рендере эпиков
            if (id) this.#emit('deleteEpic', id);
        });
        this.$('#epics-list').addEventListener('change', e =>
            this.$('#btn-delete-epic').disabled = !e.target.selectedId);
        this.$('#btn-export').addEventListener('click', () => this.#emit('exportData'));
        this.$('#btn-import').addEventListener('click', () => this.$('#file-import').click());
        this.$('#file-import').addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => this.#emit('importData', reader.result);
            reader.readAsText(file);
            e.target.value = '';                                  // позволяет выбрать тот же файл повторно
        });
        this.$('#btn-reset-all').addEventListener('click', () => this.#emit('resetAll'));

        this.$('#btn-apply').addEventListener('click', () => this.#emit('applyFilters'));
        this.$('#search').addEventListener('keydown', e => { if (e.key === 'Enter') this.#emit('applyFilters'); });
        this.$('#btn-reset-filters').addEventListener('click', () => this.#emit('resetFilters'));

        this.$('#tab-board').addEventListener('click', () => this.setMode('board'));
        this.$('#tab-list').addEventListener('click', () => this.setMode('list'));
    }

    setMode(mode) {
        this.$('#kanban-section').classList.toggle('hidden', mode !== 'board');
        this.$('#table-section').classList.toggle('hidden', mode !== 'list');
        this.$('#tab-board').classList.toggle('active', mode === 'board');
        this.$('#tab-list').classList.toggle('active', mode === 'list');
    }

    // ---------------- вывод ----------------

    /** Список досок. Флаг suppress нужен: программный change не должен звать switchBoard. */
    renderBoards(boards, currentId) {
        this.currentBoardId = currentId;
        const select = this.$('#boards-select');
        const prevHandler = this.handlers.switchBoard;
        this.handlers.switchBoard = null;                        // щит от эха (аналог _suppressBoardSwitch)
        select.innerHTML = boards.map(b =>
            `<option value="${b.id}" ${b.id === currentId ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
        this.handlers.switchBoard = prevHandler;

        const has = !!currentId;
        this.$('#btn-rename-board').disabled = !has;
        this.$('#btn-delete-board').disabled = !has;
    }

    /**
     * Канбан: три колонки с карточками. Полная пересборка innerHTML после
     * каждой мутации - SSR-мышца в клиенте: проще перерисовать всё заново,
     * чем точечно патчить (и синхронизировать) DOM.
     */
    renderColumns(columns) {
        const host = this.$('#kanban-columns');
        host.innerHTML = columns.map(col => `
            <section class="column" data-state="${col.state}">
                <header class="column-head">
                    <h2>${esc(col.title)} (${col.cards.length})</h2>
                    <button class="add-task" data-create-in="${col.state}" title="Добавить задачу">+</button>
                </header>
                <div class="cards">
                    ${col.cards.map(c => this.#cardHtml(c)).join('')}
                </div>
            </section>`).join('');

        // делегирование: "+" в шапке колонки
        host.querySelectorAll('[data-create-in]').forEach(btn =>
            btn.addEventListener('click', () => this.#emit('createTask', btn.dataset.createIn)));

        // карточки: открытие по клику, удаление по крестику
        host.querySelectorAll('.card').forEach(cardEl => {
            cardEl.addEventListener('dblclick', () => this.#emit('openTask', cardEl.dataset.taskId));
            cardEl.querySelector('.card-delete')?.addEventListener('click',
                e => { e.stopPropagation(); this.#emit('deleteTask', cardEl.dataset.taskId); });

            // HTML5 DnD: стартует на карточке
            cardEl.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', cardEl.dataset.taskId);
                e.dataTransfer.effectAllowed = 'move';
                cardEl.classList.add('dragging');
            });
            cardEl.addEventListener('dragend', () => cardEl.classList.remove('dragging'));
        });

        // колонка-приёмник: подсветка + вычисление позиции вставки по Y курсора
        host.querySelectorAll('.column').forEach(colEl => {
            colEl.addEventListener('dragover', e => { e.preventDefault(); colEl.classList.add('drop-target'); });
            colEl.addEventListener('dragleave', () => colEl.classList.remove('drop-target'));
            colEl.addEventListener('drop', e => {
                e.preventDefault();
                colEl.classList.remove('drop-target');
                const taskId = e.dataTransfer.getData('text/plain');
                if (!taskId) return;
                const index = this.#insertIndex(colEl, e.clientY);
                this.#emit('taskMoved', taskId, colEl.dataset.state, index);
            });
        });
    }

    #cardHtml(c) {
        return `<article class="card priority-${c.priorityClass} ${c.overdue ? 'overdue' : ''}"
                        draggable="true" data-task-id="${c.id}" title="Двойной клик — редактировать">
            <div class="card-top">
                <span class="key">${c.key}</span>
                <button class="card-delete" title="Удалить">×</button>
            </div>
            <div class="card-title">${esc(c.title)}</div>
            <div class="card-meta">
                ${esc(c.typeName)} · ${esc(c.priorityName)}
                ${c.assignee ? ` · <span class="assignee">${esc(c.assignee)}</span>` : ''}
            </div>
            <div class="card-extra">
                ${c.deadlineText ? `<span class="${c.overdue ? 'overdue-badge' : 'deadline'}">${c.deadlineText}</span>` : ''}
                ${c.epicKey ? `<span class="epic-chip">${c.epicKey}</span>` : ''}
            </div>
        </article>`;
    }

    /** Позиция вставки: сколько карточек выше середины курсора. */
    #insertIndex(columnEl, clientY) {
        const cards = [...columnEl.querySelectorAll('.card:not(.dragging)')];
        let index = 0;
        for (const card of cards) {
            if (clientY < card.getBoundingClientRect().top + card.offsetHeight / 2) break;
            index++;
        }
        return index;
    }

    renderEpics(epics) {
        const list = this.$('#epics-list');
        const selectedId = list.selectedId;
        list.innerHTML = epics.length
            ? epics.map(e => `<li data-id="${e.id}" class="${e.id === selectedId ? 'selected' : ''}">
                  <span>${e.key} · ${esc(e.title)}</span><b>${e.done}/${e.total}</b></li>`).join('')
            : '<li class="empty">Эпиков нет</li>';
        list.selectedId = epics.some(e => e.id === selectedId) ? selectedId : null;
        this.$('#btn-delete-epic').disabled = !list.selectedId;

        list.querySelectorAll('li[data-id]').forEach(li =>
            li.addEventListener('click', () => {
                list.querySelectorAll('li').forEach(x => x.classList.remove('selected'));
                li.classList.add('selected');
                list.selectedId = li.dataset.id;
                this.$('#btn-delete-epic').disabled = false;
            }));
    }

    showTable(rows) {
        const tbody = this.$('#tasks-table tbody');
        tbody.innerHTML = rows.map(r => `<tr>
            <td>${r.key}</td><td>${esc(r.title)}</td><td>${r.state}</td>
            <td>${r.priority}</td><td>${r.assignee}</td><td>${r.deadline}</td></tr>`).join('');
    }

    resetFilters(assignees, epics) {
        const fill = (sel, options) => {
            sel.innerHTML = '<option value="">(все)</option>' +
                options.map(o => `<option value="${o.id}">${o.label}</option>`).join('');
            sel.value = '';
        };
        fill(this.$('#filter-assignee'), assignees);
        fill(this.$('#filter-epic'), epics);
        this.$('#search').value = '';
        this.$('#sort-mode').value = 'order';
    }

    readFilterCriteria() {
        const valOrNull = v => v === '' ? null : v;               // '' = "(все)"
        return {
            assigneeId: valOrNull(this.$('#filter-assignee').value),
            epicId: valOrNull(this.$('#filter-epic').value),
            searchText: this.$('#search').value.trim(),
            sortMode: this.$('#sort-mode').value                   // 'order' | 'priority'
        };
    }

    flash(message) {
        const el = this.$('#flash');
        el.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    }

    // ---------------- диалоговые методы контракта ----------------

    prompt(title, label, initial = '') { return uiPrompt({ title, label, value: initial }); }
    confirmBox(message) { return uiConfirm(message); }
    askConfirmWord(whatFor) { return uiPrompt({ title: 'Подтверждение', label: `Для ${whatFor} введите слово СБРОС:`, confirmWord: 'СБРОС' }); }
    chooseEpicDeleteMode(key, title, count) { return uiEpicDelete(key, title, count); }

    saveFile(fileName, content) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
        return Promise.resolve(true);
    }

    openJsonFile() {
        // контракт "прочитать текст файла": используем невидимый input[type=file]
        return new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = () => {
                const f = input.files[0];
                if (!f) return resolve(null);
                const r = new FileReader();
                r.onload = () => resolve(r.result);
                r.readAsText(f);
            };
            input.click();
        });
    }
}

/** Экранирование HTML - данные пользователя не должны становиться разметкой (XSS). */
function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
