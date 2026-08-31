<script setup>
// TaskModal - диалог создания/редактирования задачи.
//
// MVVM-момент: локальная форма - reactive-объект (мини-VM диалога);
// валидация - computed error/canSave; кнопка «Сохранить» сама серая, пока
// данные невалидны. Родительский VM получает ГОТОВЫЙ результат
// (аналог TaskDialogData) - цикл валидации из gherkin соблюдён:
// пустой заголовок -> окно не закроется.
import { ref, computed } from 'vue';
import ModalShell from './ModalShell.vue';
import { answerDialog } from '../viewmodels/useKanbanViewModel.js';
import { TaskState, WorkItemType, Priority,
         STATE_TITLES, TYPE_TITLES, PRIORITY_TITLES, FILTER_NONE } from '../domain/models.js';

const props = defineProps({
    existing: { type: Object, default: null },   // null => создание
    defaultState: { type: String, default: TaskState.ToDo },
    users: { type: Array, default: () => [] },
    epics: { type: Array, default: () => [] },
});

// ----- локальное состояние формы (ViewModel диалога) -----
const form = ref({
    title: props.existing?.title ?? '',
    description: props.existing?.description ?? '',
    assigneeId: props.existing?.assigneeId ?? FILTER_NONE,
    epicId: props.existing?.epicId ?? FILTER_NONE,
    state: props.existing?.state ?? props.defaultState,
    type: props.existing?.type ?? WorkItemType.Task,
    priority: props.existing?.priority ?? Priority.Medium,
    deadline: props.existing?.deadline ?? '',
});

// ----- валидация как вычисляемое свойство -----
const error = computed(() => {
    if (!form.value.title.trim()) return 'Заголовок обязателен';
    return '';
});
const canSave = computed(() => error.value === '');

function save() {
    if (!canSave.value) return;
    answerDialog({
        // спецзначения фильтров превращаем в настоящий null домена
        title: form.value.title.trim(),
        description: form.value.description.trim(),
        assigneeId: form.value.assigneeId === FILTER_NONE ? null : form.value.assigneeId,
        epicId: form.value.epicId === FILTER_NONE ? null : form.value.epicId,
        state: form.value.state,
        type: form.value.type,
        priority: form.value.priority,
        deadline: form.value.deadline || null,
    });
}

const stateOptions = Object.values(TaskState).map(v => ({ value: v, label: STATE_TITLES[v] }));
const typeOptions = Object.values(WorkItemType).map(v => ({ value: v, label: TYPE_TITLES[v] }));
const priorityOptions = Object.values(Priority).map(v => ({ value: v, label: PRIORITY_TITLES[v] }));
</script>

<template>
    <ModalShell @cancel="answerDialog(null)">
        <h3>{{ existing ? 'Редактирование задачи' : 'Новая задача' }}</h3>

        <label class="field-label">Заголовок *</label>
        <input v-model="form.title" class="input" autofocus/>

        <label class="field-label">Описание</label>
        <textarea v-model="form.description" rows="4" class="input"></textarea>

        <div class="form-grid">
            <div>
                <label class="field-label">Статус</label>
                <select v-model="form.state" class="input">
                    <option v-for="o in stateOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
            </div>
            <div>
                <label class="field-label">Тип</label>
                <select v-model="form.type" class="input">
                    <option v-for="o in typeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
            </div>
            <div>
                <label class="field-label">Приоритет</label>
                <select v-model="form.priority" class="input">
                    <option v-for="o in priorityOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
            </div>
            <div>
                <label class="field-label">Дедлайн</label>
                <input v-model="form.deadline" type="date" class="input"/>
            </div>
        </div>

        <label class="field-label">Исполнитель</label>
        <select v-model="form.assigneeId" class="input">
            <option :value="FILTER_NONE">(без исполнителя)</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.label }}</option>
        </select>

        <label class="field-label">Эпик</label>
        <select v-model="form.epicId" class="input">
            <option :value="FILTER_NONE">(без эпика)</option>
            <option v-for="e in epics" :key="e.id" :value="e.id">{{ e.label }}</option>
        </select>

        <!-- Ошибка и состояние кнопки - биндинги на computed -->
        <p v-if="error" class="hint danger">{{ error }}</p>

        <div class="modal-actions">
            <button class="btn primary" :disabled="!canSave" @click="save">Сохранить</button>
            <button class="btn" @click="answerDialog(null)">Отмена</button>
        </div>
    </ModalShell>
</template>
