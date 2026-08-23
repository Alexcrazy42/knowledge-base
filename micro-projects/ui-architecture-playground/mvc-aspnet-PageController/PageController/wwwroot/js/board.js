// ============================================================================
// board.js - вся клиентская логика канбана. ОДИН И ТОТ ЖЕ файл подключают
// оба приложения (PageController и MVP): JS-слою всё равно, какой серверный
// паттерн рендерил HTML - он видит только DOM и endpoint'ы.
//
// Обязанности:
//   1) подтверждения опасных действий (data-confirm на форме)
//   2) открытие/закрытие нативных <dialog> (data-dialog / data-close)
//   3) drag-and-drop задач между колонками -> POST на move-endpoint
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {

    // ---------- 1) confirm перед отправкой формы ----------
    document.querySelectorAll("form[data-confirm]").forEach(form => {
        form.addEventListener("submit", event => {
            if (!confirm(form.dataset.confirm)) event.preventDefault();
        });
    });

    // ---------- 2) диалоги ----------
    // Кнопки data-dialog="id" открывают <dialog id="id">.
    document.querySelectorAll("[data-dialog]").forEach(button => {
        button.addEventListener("click", () => {
            const dialog = document.getElementById(button.dataset.dialog);
            if (dialog) dialog.showModal();
        });
    });
    // Кнопки/ссылки data-close закрывают родительский <dialog> (только JS-opened).
    document.querySelectorAll("[data-close]").forEach(el => {
        el.addEventListener("click", () => el.closest("dialog")?.close());
    });

    // ---------- 3) drag-and-drop ----------
    // Endpoint перемещения и текущая доска лежат в data-* атрибутах контейнера:
    const root = document.querySelector("[data-move-url]");
    if (!root) return;                       // страница без канбана (Users) - выходим
    const moveUrl = root.dataset.moveUrl;
    const boardId = root.dataset.boardId;

    let draggedId = null;

    // Анти-CSRF токен: Razor сам вставляет hidden input в каждую POST-форму,
    // забираем значение из любой из них для нашего fetch-запроса.
    const csrfToken = () =>
        document.querySelector('input[name="__RequestVerificationToken"]')?.value ?? "";

    function clearMarkers() {
        document.querySelectorAll(".insert-before").forEach(x => x.classList.remove("insert-before"));
        document.querySelectorAll(".insert-end").forEach(x => x.classList.remove("insert-end"));
        document.querySelectorAll(".drop-target").forEach(x => x.classList.remove("drop-target"));
    }

    // Индекс вставки: считаем, сколько карточек выше середины курсора.
    // gherkin: "при наведении над колонкой появляется индикатор вставки"
    function computeIndex(column, clientY) {
        const cards = [...column.querySelectorAll(".card")]
            .filter(c => !c.classList.contains("dragging"));
        for (let i = 0; i < cards.length; i++) {
            const rect = cards[i].getBoundingClientRect();
            if (clientY < rect.top + rect.height / 2) return i;
        }
        return cards.length;                 // в конец колонки
    }

    function showIndicator(column, clientY) {
        clearMarkers();
        column.classList.add("drop-target");          // подсветка зоны дропа
        const cards = [...column.querySelectorAll(".card")]
            .filter(c => !c.classList.contains("dragging"));
        const index = computeIndex(column, clientY);
        if (index < cards.length) cards[index].classList.add("insert-before");
        else column.classList.add("insert-end");
    }

    document.querySelectorAll('.card[draggable="true"]').forEach(card => {
        card.addEventListener("dragstart", event => {
            draggedId = card.dataset.taskId;
            event.dataTransfer.setData("text/plain", draggedId);
            event.dataTransfer.effectAllowed = "move";
            card.classList.add("dragging");           // gherkin: задача полупрозрачна
        });
        card.addEventListener("dragend", () => {
            draggedId = null;
            card.classList.remove("dragging");
            clearMarkers();
        });
    });

    document.querySelectorAll(".column").forEach(column => {
        column.addEventListener("dragover", event => {
            if (!draggedId) return;
            event.preventDefault();                   // разрешаем drop
            event.dataTransfer.dropEffect = "move";
            showIndicator(column, event.clientY);
        });
        column.addEventListener("drop", async event => {
            event.preventDefault();
            if (!draggedId) return;
            const fd = new FormData();
            fd.set("boardId", boardId);
            fd.set("taskId", draggedId);
            fd.set("column", column.dataset.column);  // TaskState как строка: ToDo|InProgress|Done
            fd.set("index", String(computeIndex(column, event.clientY)));
            fd.set("__RequestVerificationToken", csrfToken());
            await fetch(moveUrl, { method: "POST", body: fd });
            // SSR: после мутации просто перезагружаем страницу -
            // сервер отрендерит актуальное состояние заново.
            location.reload();
        });
    });
});
