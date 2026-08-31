<script setup>
// EpicDeleteModal - выбор режима удаления эпика:
//   'detach'  - задачи остаются без эпика (EpicDeleteMode.DetachTasks в C#)
//   'cascade' - задачи удаляются вместе с эпиком
import ModalShell from './ModalShell.vue';
import { answerDialog } from '../viewmodels/useKanbanViewModel.js';

const props = defineProps({
    epicKey: { type: String, required: true },   // "EPIC-1"
    title: { type: String, required: true },
    taskCount: { type: Number, default: 0 },
});
</script>

<template>
    <ModalShell @cancel="answerDialog(null)">
        <h3>Удаление {{ epicKey }}</h3>
        <p>Удалить {{ epicKey }} «{{ title }}»?</p>
        <p v-if="taskCount > 0" class="hint">С эпиком связано {{ taskCount }} задач(и). Что с ними сделать?</p>

        <div class="modal-actions column">
            <button class="btn wide" @click="answerDialog('detach')">
                Удалить эпик{{ taskCount ? ', задачи оставить' : '' }}
            </button>
            <button class="btn danger wide" :disabled="taskCount === 0" @click="answerDialog('cascade')">
                Удалить эпик и {{ taskCount }} задач(и)
            </button>
            <button class="btn wide" @click="answerDialog(null)">Отмена</button>
        </div>
    </ModalShell>
</template>
