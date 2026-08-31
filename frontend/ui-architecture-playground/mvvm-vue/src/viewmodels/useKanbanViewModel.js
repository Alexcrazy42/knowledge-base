// ============================================================================
// useKanbanViewModel - "ViewModel" главного экрана в идиоме Vue 3 (composable).
//
// Соответствие слоям:
//   Model      - domain/store.js (+models.js), чистые данные без UI
//   ViewModel  - ЭТОТ ФАЙЛ: refs/computed (состояние для биндинга)
//                и функции-команды (сценарии gherkin)
//   View       - App.vue и компоненты: только шаблон + v-model на свойства VM
//
// Сравните с MainViewModel.cs из mvvm-wpf: те же поля, те же команды.
// Разница механики: WPF шлёт PropertyChanged, Vue отслеживает зависимости
// сам во время рендера - кода-клея ещё меньше.
//
// Диалоги реализованы promise-ами (как uiPrompt в mvp-vanillajs):
//   const name = await ask('prompt', {...}); - VM не знает, КТО рисует окно.
// ============================================================================

import { ref, computed, reactive } from 'vue';
import { store } from '../domain/store.js';
import {
    TaskState, FILTER_NONE, stateTitle,
    priorityTitle, typeTitle, todayIso, isOverdue,
} from '../domain/models.js';

// ---------------- механизм диалогов (мини-"DialogService") ----------------

export const dialog = reactive({ kind: null, props: {} });
let dialogResolver = null;

function ask(kind, props = {}) {
    return new Promise(resolve => {
        dialog.kind = kind;
        dialog.props = props;
        dialogResolver = resolve;
    });
}

/** Вызывают модальные компоненты, когда пользователь ответил. */
export function answerDialog(value) {
    const resolve = dialogResolver;
    dialogResolver = null;
    dialog.kind = null;
    resolve?.(value);
}

// ---------------- ViewModel ----------------

export function useKanbanViewModel() {
    // ----- состояние для биндинга -----
    const currentBoardId = ref(store.firstBoard()?.id ?? null);
    const search = ref('');
    const assigneeFilter = ref(null);            // null | userId | FILTER_NONE
    const epicFilter = ref(null);                // null | epicId | FILTER_NONE
    const sortByPriority = ref(false);
    const flash = ref('Создайте первую доску');

    // ----- вычисляемое (то, что в MVP вручную собирал Reload()) -----

    const currentBoard = computed(() =>
        currentBoardId.value ? store.findBoard(currentBoardId.value) : null);

    const users = computed(() => store.users);

    /** Опции комбобокса исполнителей: «(все)» / «Без исполнителя» / пользователи. */
    const assigneeOptions = computed(() => [
        { id: null, label: '(все исполнители)' },
        { id: FILTER_NONE, label: 'Без исполнителя' },
        ...store.users.map(u => ({ id: u.id, label: u.name })),
    ]);

    const epicOptions = computed(() => [
        { id: null, label: '(все эпики)' },
        { id: FILTER_NONE, label: 'Без эпика' },
        ...(currentBoard.value?.epics ?? [])
            .map(e => ({ id: e.id, label: `EPIC-${e.number} · ${e.title}` })),
    ]);

    /** Фильтрация+сортировка - правила те же, что во всех версиях проекта. */
    const visibleTasks = computed(() => {
        let q = [...(currentBoard.value?.tasks ?? [])];
        if (assigneeFilter.value !== null)
            q = q.filter(t => assigneeFilter.value === FILTER_NONE
                ? t.assigneeId === null : t.assigneeId === assigneeFilter.value);
        if (epicFilter.value !== null)
            q = q.filter(t => epicFilter.value === FILTER_NONE
                ? t.epicId === null : t.epicId === epicFilter.value);
        if (search.value.trim())
            q = q.filter(t => (t.title + ' ' + t.description).toLowerCase()
                .includes(search.value.trim().toLowerCase()));
        if (sortByPriority.value)
            q.sort((a, z) => rank(a.priority) - rank(z.priority) || a.order - z.order);
        else
            q.sort((a, z) => a.order - z.order);
        return q;
    });

    const rank = p => p === 'high' ? 0 : p === 'medium' ? 1 : 2;

    /** Три колонки канбана как вычисляемое свойство - никакого rebuild-кода. */
    const columns = computed(() =>
        Object.values(TaskState).map(state => ({
            state,
            title: stateTitle(state),
            cards: visibleTasks.value.filter(t => t.state === state).map(toCard),
        })));

    const userName = id => store.users.find(u => u.id === id)?.name ?? 'не назначен';

    const toCard = t => ({
        task: t,
        key: `TASK-${t.number}`,
        assignee: userName(t.assigneeId),
        epicKey: t.epicId && currentBoard.value
            ? `EPIC-${currentBoard.value.epics.find(e => e.id === t.epicId)?.number ?? '?'}`
            : null,
        priorityLabel: priorityTitle(t.priority),
        typeLabel: typeTitle(t.type),
        overdue: isOverdue(t),
    });

    /** Эпики с прогрессом (gherkin Epic Management). */
    const epicsWithProgress = computed(() =>
        (currentBoard.value?.epics ?? []).map(e => {
            const tasks = currentBoard.value.tasks.filter(t => t.epicId === e.id);
            const done = tasks.filter(t => t.state === TaskState.Done).length;
            return {
                epic: e,
                key: `EPIC-${e.number}`,
                total: tasks.length,
                done,
                progress: tasks.length === 0 ? 0 : done / tasks.length,
                label: `EPIC-${e.number} · ${e.title} (${done}/${tasks.length})`,
            };
        }));

    // ----- команды (те же сценарии, что в презентерах/VM других версий) -----

    function setFlash(msg) { flash.value = `[${new Date().toLocaleTimeString()}] ${msg}`; }

    async function createBoard() {
        const name = await ask('prompt', { title: 'Новая доска', label: 'Название доски:' });
        if (!name?.trim()) return;
        const b = store.createBoard(name.trim());
        currentBoardId.value = b.id;
        setFlash(`Доска «${b.name}» создана`);
    }

    async function renameBoard() {
        if (!currentBoard.value) return;
        const name = await ask('prompt',
            { title: 'Переименовать доску', label: 'Новое название:', initial: currentBoard.value.name });
        if (!name?.trim()) return;
        store.renameBoard(currentBoard.value.id, name.trim());
        setFlash('Доска переименована');
    }

    async function deleteBoard() {
        const b = currentBoard.value;
        if (!b) return;
        if (!(await ask('confirm', { message: `Удалить доску «${b.name}» вместе со всеми задачами?` }))) return;
        store.deleteBoard(b.id);
        currentBoardId.value = store.firstBoard()?.id ?? null;   // gherkin: показать оставшуюся
        setFlash('Доска удалена');
    }

    async function createEpic() {
        if (!currentBoard.value) return;
        const title = await ask('prompt', { title: 'Новый эпик', label: 'Название эпика:' });
        if (!title?.trim()) return;
        const epic = store.addEpic(currentBoard.value.id, title.trim());
        if (epic) setFlash(`EPIC-${epic.number} создан`);
    }

    async function deleteSelectedEpic(epicRow) {
        const board = currentBoard.value;
        if (!board || !epicRow) return;
        const mode = await ask('epicDelete', {
            epicKey: epicRow.key, title: epicRow.epic.title, taskCount: epicRow.total,
        });
        if (!mode) return;
        store.deleteEpic(board.id, epicRow.epic.id, mode);
        setFlash(mode === 'cascade'
            ? `${epicRow.key} удалён вместе с задачами`
            : `${epicRow.key} удалён, задачи остались`);
    }

    function seedTestEpic() {
        if (!currentBoard.value) return;
        const epic = store.seedTestEpic(currentBoard.value.id);
        setFlash(epic ? `EPIC-${epic.number} с тестовыми задачами добавлен` : 'Не удалось создать эпик');
    }

    function seedRandomTasks() {
        if (!currentBoard.value) return;
        store.seedRandomTasks(currentBoard.value.id, 10);
        setFlash('Добавлено 10 случайных задач');
    }

    /**
     * Создание/редактирование задачи. spec=null -> создание на колонку state.
     * Сама форма (TaskModal) держит свои локальные данные; сюда приходит ГОТОВЫЙ
     * результат после внутренней валидации - как TaskDialogData в C#-версии.
     */
    async function openTaskEditor(task = null, defaultState = TaskState.ToDo) {
        const board = currentBoard.value;
        if (!board) return;

        const result = await ask('task', {
            existing: task ? {
                title: task.title, description: task.description,
                assigneeId: task.assigneeId, epicId: task.epicId,
                state: task.state, type: task.type, priority: task.priority,
                deadline: task.deadline ?? '',
            } : null,
            defaultState,
            users: store.users.map(u => ({ id: u.id, label: u.name })),
            epics: board.epics.map(e => ({ id: e.id, label: `EPIC-${e.number} · ${e.title}` })),
        });
        if (!result) return;                                     // отмена

        if (task) {
            store.updateTask(board.id, task.id, t => Object.assign(t, result));
            setFlash(`TASK-${task.number} сохранена`);
        } else {
            const created = store.addTask(board.id, result);
            if (created) setFlash(`TASK-${created.number} создана`);
        }
    }

    async function deleteTask(card) {
        const board = currentBoard.value;
        if (!board) return;
        if (!(await ask('confirm', { message: `Удалить ${card.key} «${card.task.title}»?` }))) return;
        store.deleteTask(board.id, card.task.id);
        setFlash(`${card.key} удалена`);
    }

    /** DnD: индекс вставки колонка считает по Y-координатам карточек. */
    function moveTask(taskId, targetState, targetIndex = Number.MAX_SAFE_INTEGER) {
        if (!currentBoard.value) return;
        store.moveTask(currentBoard.value.id, taskId, targetState, targetIndex);
    }

    function resetFilters() {
        search.value = '';
        assigneeFilter.value = null;
        epicFilter.value = null;
        sortByPriority.value = false;
    }

    function exportJson() {
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const blob = new Blob([store.exportJson()], { type: 'application/json' });   // как в vanilla-презентере
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kanban-export-${stamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setFlash('Данные экспортированы в JSON');
    }

    async function importJson() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();                 // асинхронное чтение файла
            reader.onload = () => {
                try {
                    store.importJson(String(reader.result));
                    currentBoardId.value = store.firstBoard()?.id ?? null;
                    setFlash('Импорт выполнен');
                } catch (err) {
                    setFlash(`Ошибка импорта: ${err.message}`);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    async function resetAll() {
        const word = await ask('prompt', {
            title: 'Подтверждение', label: 'Для полного сброса всех данных введите слово СБРОС:',
            confirmWord: 'СБРОС',
        });
        if (word !== 'СБРОС') { setFlash('Сброс отменён (нужно слово СБРОС)'); return; }
        store.resetAll();
        currentBoardId.value = null;
        setFlash('Все данные удалены');
    }

    return {
        // состояние
        currentBoardId, currentBoard, boards: computed(() => store.boards),
        users, search, assigneeFilter, epicFilter, sortByPriority, flash,
        assigneeOptions, epicOptions, columns, epicsWithProgress,
        dialog,
        // команды
        createBoard, renameBoard, deleteBoard, createEpic, deleteSelectedEpic,
        seedTestEpic, seedRandomTasks, openTaskEditor, deleteTask, moveTask,
        resetFilters, exportJson, importJson, resetAll,
    };
}
