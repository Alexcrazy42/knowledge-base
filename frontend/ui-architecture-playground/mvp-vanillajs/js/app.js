// ============================================================================
// app.js - КОМПОЗИЦИОННЫЙ КОРЕНЬ (JS-аналог Program.cs).
//
// Единственное место, где View, Presenter и Store встречаются вместе:
//
//   BoardView  <--контракт--  BoardPresenter  --store-->  BoardStore
//   UsersView  <--контракт--  UsersPresenter ----onChanged----^
//
// Порядок подключения скриптов задаёт "using"-и: index.html грузит файлы
// сверху вниз, поэтому модели и вьюхи определены раньше презентеров.
// ============================================================================

'use strict';

(() => {
    // Model: один стор на всё приложение (данные + localStorage-персистентность)
    const store = new BoardStore();

    // Views: пассивные, знают только про DOM
    const boardView = new BoardView(document.getElementById('app'));
    const usersView = new UsersView(document.getElementById('users-screen'));

    let boardPresenter;

    // Presenters: связываем снаружи, кто кого открывает и чем обновляется.
    // Фабрика диалога задачи - JS-версия UseTaskEditDialog: презентер не знает,
    // что диалог рисуется через DOM, он просто вызывает функцию.
    const usersPresenter = new UsersPresenter(usersView, store, null);

    boardPresenter = new BoardPresenter(boardView, store, {
        openUsersScreen: () => usersPresenter.open(),
        // фабрика ВОЗВРАЩАЕТ функцию открытия диалога (аналог () => new TaskEditForm()):
        // презентер вызывает taskEditFactory()(spec)
        taskEditFactory: () => uiTaskEdit
    });
    usersPresenter.onChanged = () => boardPresenter.externalRefresh();

    usersPresenter.run();      // подписка обработчиков экрана пользователей
    boardPresenter.run();      // подписка + первый рендер
})();
