<script setup>
// PromptModal - однострочный ввод. Режим confirmWord («слово СБРОС»):
// кнопка OK не сработает, пока не введено точное слово - как во всех версиях.
import { ref } from 'vue';
import ModalShell from './ModalShell.vue';
import { answerDialog } from '../viewmodels/useKanbanViewModel.js';

const props = defineProps({
    title: { type: String, required: true },
    label: { type: String, default: '' },
    initial: { type: String, default: '' },
    confirmWord: { type: String, default: null },
});

const value = ref(props.initial);

function ok() {
    if (props.confirmWord && value.value.trim() !== props.confirmWord) return;  // валидация слова
    answerDialog(value.value);
}
</script>

<template>
    <ModalShell @cancel="answerDialog(null)">
        <h3>{{ title }}</h3>
        <label class="field-label">{{ label }}</label>
        <!-- autofocus + Enter подтверждает -->
        <input v-model="value" class="input" autofocus @keydown.enter="ok"/>
        <p v-if="confirmWord" class="hint danger">Для подтверждения введите слово {{ confirmWord }}</p>
        <div class="modal-actions">
            <button class="btn primary" @click="ok">OK</button>
            <button class="btn" @click="answerDialog(null)">Отмена</button>
        </div>
    </ModalShell>
</template>
