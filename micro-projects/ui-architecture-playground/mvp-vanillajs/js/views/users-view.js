// ============================================================================
// UsersView - экран пользователей (аналог UsersForm). Пассивная вьюха:
// рисует список, читает input, транслирует клики в обработчики контракта.
// ============================================================================

'use strict';

class UsersView {
    constructor(root) {
        this.root = root;
        this.$ = sel => root.querySelector(sel);
        this.handlers = {};
    }

    bindHandlers(handlers) {
        // { addUser, deleteUser(id), close }
        this.handlers = handlers;
    }

    open() { this.root.classList.remove('hidden'); this.#render(this._lastName); }
    close() {
        this.root.classList.add('hidden');
        this.handlers.close?.();
    }

    get isOpen() { return !this.root.classList.contains('hidden'); }

    /** Текущий текст поля ввода - презентер читает при добавлении. */
    get newUserName() { return this.root.querySelector('#new-user-name')?.value ?? ''; }

    /** После успешного добавления поле чистим - иначе повторный клик создаст дубликат. */
    clearNewUserName() {
        this._lastName = '';
        const input = this.root.querySelector('#new-user-name');
        if (input) input.value = '';
    }

    showUsers(rows) {
        // запоминаем незавершённый ввод, чтобы перерисовка его не стирала
        const input = this.root.querySelector('#new-user-name');
        if (input && this.isOpen) this._lastName = input.value;
        this._rows = rows;
        if (this.isOpen) this.#render(this._lastName);
    }

    _rows = [];
    _lastName = '';

    flash(message) {
        const el = this.$('#users-flash');
        if (el) el.textContent = message;
    }

    /** Диалог удаления: {confirmed, reassignTo} - вся логика показа окон здесь. */
    askDeleteUser(userName, otherUsers, taskCount) {
        return uiDeleteUser(userName, otherUsers, taskCount);
    }

    #render(keepName) {
        this.root.innerHTML = `
            <div class="users-panel">
                <h2>Пользователи</h2>
                <ul id="users-list" class="users-list">
                    ${this._rows.map(u => `<li>
                        <span>${esc(u.name)} <small>(${u.taskCount} задач)</small></span>
                        <button data-del="${u.id}" title="Удалить">×</button>
                    </li>`).join('') || '<li class="empty">Пользователей нет</li>'}
                </ul>
                <div class="add-row">
                    <input type="text" id="new-user-name" placeholder="Имя нового пользователя"
                           value="${esc(keepName)}">
                    <button id="btn-add-user" class="primary">Добавить</button>
                </div>
                <p id="users-flash" class="flash"></p>
                <div class="modal-buttons">
                    <button id="btn-close-users">Закрыть</button>
                </div>
            </div>`;

        this.$('#btn-add-user').addEventListener('click', () => this.handlers.addUser?.());
        this.$('#new-user-name').addEventListener('keydown', e => {
            if (e.key === 'Enter') this.handlers.addUser?.();
        });
        this.root.querySelectorAll('[data-del]').forEach(btn =>
            btn.addEventListener('click', () => this.handlers.deleteUser?.(btn.dataset.del)));
        this.$('#btn-close-users').addEventListener('click', () => this.close());
    }
}
