// ============================================================================
// UsersPresenter - презентер экрана пользователей. JS-порт UsersPresenter.
// Связь с главным экраном - колбэк onChanged (аналог события Changed ->
// boardPresenter.externalRefresh() в композиционном корне app.js).
// ============================================================================

'use strict';

class UsersPresenter {
    constructor(view, store, onChanged) {
        this.view = view;
        this.store = store;
        this.onChanged = onChanged;
    }

    run() {
        this.view.bindHandlers({
            addUser: () => this.addUser(),
            deleteUser: id => this.deleteUser(id),
            close: () => this.onChanged?.()          // вернулись на доску - она перечитает данные
        });
    }

    open() {
        if (!this.view.isOpen) {
            this.view.open();
            this.reload();
        }
    }

    reload() {
        this.view.showUsers(this.store.users.map(u => ({
            id: u.id,
            name: u.name,
            taskCount: this.store.countTasksAssignedTo(u.id)
        })));
    }

    addUser() {
        const name = this.view.newUserName.trim();
        if (!name) {
            this.view.flash('Введите имя пользователя');
            return;
        }
        this.store.addUser(name);
        this.view.clearNewUserName();                // защита от дубликатов по повторному клику
        this.onChanged?.();                          // у доски появятся новые опции фильтров/назначения
        this.reload();
        this.view.flash(`Пользователь «${name}» добавлен`);
    }

    async deleteUser(userId) {
        const user = this.store.users.find(u => u.id === userId);
        if (!user) return;

        const count = this.store.countTasksAssignedTo(userId);

        // gherkin: если задач нет - просто подтвердить; иначе предложить переназначение.
        const choice = await this.view.askDeleteUser(
            user.name,
            this.store.users.filter(u => u.id !== userId)
                .map(u => ({ id: u.id, label: u.name })),
            count);
        if (!choice.confirmed) return;

        this.store.deleteUser(userId, choice.reassignTo);
        const targetName = choice.reassignTo
            ? this.store.users.find(u => u.id === choice.reassignTo)?.name
            : null;

        // сначала перерисовка, потом flash: reload() пересобирает панель
        // и стёр бы сообщение, проставленное до неё
        this.onChanged?.();                          // карточки на доске сменили исполнителя
        this.reload();
        this.view.flash(targetName
            ? `Пользователь удалён; задачи переназначены на ${targetName}`
            : 'Пользователь удалён; его задачи остались нераспределёнными');
    }
}
