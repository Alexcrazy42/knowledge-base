// ============================================================================
// МОДАЛЬНЫЕ ОКНА - view-утилиты, JS-аналог PromptForm/EpicDeleteForm/TaskEditForm.
//
// Все возвращают Promise (вместо ShowDialog + свойств). ВАЖНО: это слой View -
// презентеры вызывают их, но получают их через методы вьюхи/фабрику,
// а не импортируют напрямую (см. UseTaskEditDialog-аналог в app.js).
// ============================================================================

'use strict';

/** Каркас модального окна: оверлей + карточка; resolve(true/false) по кнопкам. */
function openModal(innerHtml) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">${innerHtml}
            <div class="modal-buttons">
                <button data-act="ok" class="primary">ОК</button>
                <button data-act="cancel">Отмена</button>
            </div></div>`;
        document.body.appendChild(overlay);

        const close = result => { overlay.remove(); resolve(result); };
        overlay.querySelector('[data-act="ok"]').addEventListener('click', () => close(true));
        overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
        // клик по затемнению = отмена
        overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(false); });
    });
}

/** uiPrompt: ввод строки. confirmWord - режим "слово-подтверждение" (gherkin: СБРОС). */
function uiPrompt({ title, label, value = '', confirmWord = null }) {
    return new Promise(async resolve => {
        // расширяем каркас своей логикой активации ОК
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">
            <h3>${title}</h3><label>${label}</label>
            <input type="text" id="ui-prompt-input" value="${value.replace(/"/g, '&quot;')}">
            <div class="modal-buttons">
                <button data-act="ok" class="primary" ${confirmWord ? 'disabled' : ''}>ОК</button>
                <button data-act="cancel">Отмена</button>
            </div></div>`;
        document.body.appendChild(overlay);

        const input = overlay.querySelector('#ui-prompt-input');
        const okBtn = overlay.querySelector('[data-act="ok"]');
        if (confirmWord) input.addEventListener('input', () => okBtn.disabled = input.value !== confirmWord);

        const close = result => {
            const text = input.value;
            overlay.remove();
            resolve(result ? text : null);
        };
        okBtn.addEventListener('click', () => close(true));
        overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !okBtn.disabled) close(true);
            if (e.key === 'Escape') close(false);
        });
        setTimeout(() => { input.focus(); input.select(); }, 0);
    });
}

/** Выбор режима удаления эпика: 'detach' | 'cascade' | null (передумал). */
function uiEpicDelete(epicKey, epicTitle, taskCount) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const empty = taskCount === 0;
        overlay.innerHTML = `<div class="modal">
            <h3>Удаление ${epicKey}</h3>
            <p>${empty ? `Эпик «${epicTitle}» пуст. Удалить его?`
                       : `В эпике «${epicTitle}» ${taskCount} задач. Что с ними сделать?`}</p>
            <div class="modal-buttons column">
                <button data-mode="detach" class="primary">${empty ? 'Удалить эпик' : 'Задачи оставить (отвязать)'}</button>
                <button data-mode="cascade" ${empty ? 'disabled' : ''}>Удалить вместе с задачами (${taskCount})</button>
                <button data-mode="cancel">Отмена</button>
            </div></div>`;
        document.body.appendChild(overlay);

        overlay.querySelectorAll('[data-mode]').forEach(btn =>
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                overlay.remove();
                resolve(mode === 'cancel' ? null : mode);
            }));
    });
}

/**
 * Диалог создания/редактирования задачи. Аналог ITaskEditView.ShowModal:
 * возвращает Promise<data|null>; при пустом заголовке показывает ошибку
 * ВНУТРИ диалога и не закрывается - цикл валидации остаётся у презентера.
 * taskEditFactory в презентере оборачивает этот вызов.
 */
function uiTaskEdit({ title, assignees, epics, task = null, defaultState = TaskState.ToDo }) {
    return new Promise(resolve => {
        const opt = (list, selected, noneLabel) =>
            `<option value="">${noneLabel}</option>` +
            list.map(o => `<option value="${o.id}" ${o.id === selected ? 'selected' : ''}>${o.label}</option>`).join('');

        const stateOpts = Object.values(TaskState)
            .map(s => `<option value="${s}" ${(task?.state ?? defaultState) === s ? 'selected' : ''}>${stateTitle(s)}</option>`).join('');
        const typeOpts = Object.values(WorkItemType)
            .map(t => `<option value="${t}" ${(task?.type ?? WorkItemType.Task) === t ? 'selected' : ''}>${typeTitle(t)}</option>`).join('');
        const prioOpts = Object.values(Priority)
            .map(p => `<option value="${p}" ${(task?.priority ?? Priority.Medium) === p ? 'selected' : ''}>${priorityTitle(p)}</option>`).join('');

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal wide">
            <h3>${title}</h3>
            <div class="form-grid">
                <label>Заголовок:</label><input type="text" id="te-title" value="${task?.title ?? ''}">
                <label>Описание:</label><textarea id="te-desc" rows="3">${task?.description ?? ''}</textarea>
                <label>Исполнитель:</label><select id="te-assignee">${opt(assignees, task?.assigneeId, '(нет)')}</select>
                <label>Эпик:</label><select id="te-epic">${opt(epics, task?.epicId, '(без эпика)')}</select>
                <label>Статус:</label><select id="te-state">${stateOpts}</select>
                <label>Тип:</label><select id="te-type">${typeOpts}</select>
                <label>Приоритет:</label><select id="te-priority">${prioOpts}</select>
                <label>Дедлайн:</label><span class="deadline-row">
                    <input type="checkbox" id="te-deadline-on" ${task?.deadline ? 'checked' : ''}>
                    <input type="date" id="te-deadline" value="${task?.deadline ?? ''}">
                </span>
            </div>
            <p class="validation" id="te-error"></p>
            <div class="modal-buttons">
                <button data-act="ok" class="primary">Сохранить</button>
                <button data-act="cancel">Отмена</button>
            </div></div>`;
        document.body.appendChild(overlay);

        const q = sel => overlay.querySelector(sel);
        q('#te-deadline').disabled = !q('#te-deadline-on').checked;
        q('#te-deadline-on').addEventListener('change', e => q('#te-deadline').disabled = !e.target.checked);
        q('#te-title').focus();

        const close = result => {
            if (!result) { overlay.remove(); return resolve(null); }
            const titleValue = q('#te-title').value.trim();
            if (!titleValue) {
                // валидация заголовка - на стороне ПРЕЗЕНТЕРА было бы честнее,
                // но контракт тот же: диалог остаётся открытым и показывает ошибку
                q('#te-error').textContent = 'Заголовок обязателен.';
                return;
            }
            const data = {
                title: titleValue,
                description: q('#te-desc').value.trim(),
                assigneeId: q('#te-assignee').value || null,
                epicId: q('#te-epic').value || null,
                state: q('#te-state').value,
                type: q('#te-type').value,
                priority: q('#te-priority').value,
                deadline: q('#te-deadline-on').checked ? q('#te-deadline').value || null : null
            };
            overlay.remove();
            resolve(data);
        };
        q('[data-act="ok"]').addEventListener('click', () => close(true));
        q('[data-act="cancel"]').addEventListener('click', () => close(false));
    });
}

/** Диалог удаления пользователя: {confirmed, reassignTo} как ReassignChoice. */
function uiDeleteUser(userName, otherUsers, taskCount) {
    if (taskCount === 0) {
        return uiConfirm(`Удалить пользователя «${userName}»?`)
            .then(confirmed => ({ confirmed, reassignTo: null }));
    }
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">
            <h3>Удаление «${userName}»</h3>
            <p>У пользователя ${taskCount} задач. Передать их другому пользователю?</p>
            <select id="du-target">${otherUsers.map(o => `<option value="${o.id}">${o.label}</option>`).join('')}</select>
            <div class="modal-buttons">
                <button data-r="reassign" class="primary">Удалить и переназначить</button>
                <button data-r="unassigned">Оставить нераспределёнными</button>
                <button data-r="cancel">Отмена</button>
            </div></div>`;
        document.body.appendChild(overlay);

        const close = result => { overlay.remove(); resolve(result); };
        // читаем select ДО удаления overlay
        overlay.querySelector('[data-r="reassign"]').addEventListener('click',
            () => close({ confirmed: true, reassignTo: overlay.querySelector('#du-target').value || null }));
        overlay.querySelector('[data-r="unassigned"]').addEventListener('click',
            () => close({ confirmed: true, reassignTo: null }));
        overlay.querySelector('[data-r="cancel"]').addEventListener('click',
            () => close({ confirmed: false, reassignTo: null }));
    });
}

function uiConfirm(message) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal"><h3>Подтверждение</h3><p>${message}</p>
            <div class="modal-buttons">
                <button data-a="yes" class="primary">ОК</button>
                <button data-a="no">Отмена</button>
            </div></div>`;
        document.body.appendChild(overlay);
        overlay.querySelectorAll('[data-a]').forEach(b =>
            b.addEventListener('click', () => {
                const yes = b.dataset.a === 'yes';
                overlay.remove();
                resolve(yes);
            }));
    });
}
