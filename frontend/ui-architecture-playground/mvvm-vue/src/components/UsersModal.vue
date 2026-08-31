<script setup>
// UsersModal - экран пользователей в виде модалки (двухшаговый):
//   шаг 1 - список + добавление/удаление;
//   шаг 2 - при удалении с незавершёнными задачами: выбор, кому передать.
// Вся логика локальна для диалога и работает через store - реактивность
// Vue сама обновит канбан позади окна (никаких onChanged-колбэков!).
import { ref, computed } from 'vue';
import ModalShell from './ModalShell.vue';
import { store } from '../domain/store.js';
import { TaskState } from '../domain/models.js';

const emit = defineEmits(['close']);

const newName = ref('');
const flash = ref('');
const step = ref('list');                 // 'list' | 'reassign'
const pendingDelete = ref(null);          // { user, open }
const reassignChoice = ref('');

// Статистика по задачам всех досок (как в UsersViewModel.Refresh C#-версии)
const rows = computed(() => {
    const openByUser = new Map();
    const totalByUser = new Map();
    for (const b of store.boards)
        for (const t of b.tasks) {
            if (!t.assigneeId) continue;
            totalByUser.set(t.assigneeId, (totalByUser.get(t.assigneeId) ?? 0) + 1);
            if (t.state !== TaskState.Done)
                openByUser.set(t.assigneeId, (openByUser.get(t.assigneeId) ?? 0) + 1);
        }
    return store.users.map(u => ({
        user: u,
        open: openByUser.get(u.id) ?? 0,
        summary: `${totalByUser.get(u.id) ?? 0} задач всего`,
    }));
});

function addUser() {
    const name = newName.value.trim();
    if (!name) { flash.value = 'Имя обязательно'; return; }
    if (store.users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
        flash.value = `Пользователь «${name}» уже есть`;
        return;
    }
    store.addUser(name);
    newName.value = '';                   // очистка поля через биндинг
    flash.value = `«${name}» добавлен(а)`;
}

function requestDelete(row) {
    const others = store.users.filter(u => u.id !== row.user.id);
    if (row.open > 0 && others.length > 0) {
        pendingDelete.value = { ...row, others };
        reassignChoice.value = others[0].id;
        step.value = 'reassign';          // второй шаг: кому передать задачи
        return;
    }
    doDelete(row, null);
}

function confirmReassign() {
    doDelete(pendingDelete.value, reassignChoice.value);
}

function doDelete(row, reassignTo) {
    if (row.open > 0 && !reassignTo) {
        flash.value = `У «${row.user.name}» ${row.open} активных задач, но некому их передать.`;
        step.value = 'list';
        pendingDelete.value = null;
        return;
    }
    store.deleteUser(row.user.id, reassignTo);
    step.value = 'list';
    pendingDelete.value = null;
    flash.value = reassignTo ? `«${row.user.name}» удалён(а), задачи перенесены`
                             : `«${row.user.name}» удалён(а)`;
}
</script>

<template>
    <ModalShell @cancel="$emit('close')">
        <!-- ШАГ 1: список пользователей -->
        <template v-if="step === 'list'">
            <h3>Пользователи</h3>
            <ul class="user-list">
                <li v-for="row in rows" :key="row.user.id" :class="{ hasOpen: row.open > 0 }">
                    <span class="user-name">{{ row.user.name }}</span>
                    <span class="user-summary">{{ row.summary }}</span>
                    <button class="icon-btn danger" title="Удалить" @click="requestDelete(row)">&#128465;</button>
                </li>
            </ul>
            <p v-if="rows.length === 0" class="empty small">Пока никого нет.</p>

            <div class="inline-form">
                <input v-model="newName" class="input grow" placeholder="Имя нового пользователя"
                       @keydown.enter="addUser"/>
                <button class="btn primary" @click="addUser">Добавить</button>
            </div>
            <p class="hint danger">{{ flash }}</p>
        </template>

        <!-- ШАГ 2: перенос незавершённых задач -->
        <template v-else>
            <h3>Перенос задач</h3>
            <p>У «{{ pendingDelete.user.name }}» {{ pendingDelete.open }} незавершённых задач(и).</p>
            <label class="field-label">Кому передать?</label>
            <select v-model="reassignChoice" class="input">
                <option v-for="u in pendingDelete.others" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
            <div class="modal-actions">
                <button class="btn primary" @click="confirmReassign">Перенести и удалить</button>
                <button class="btn" @click="step = 'list'">Назад</button>
            </div>
        </template>

        <div class="modal-actions">
            <button class="btn wide" @click="$emit('close')">Закрыть</button>
        </div>
    </ModalShell>
</template>
