<script setup>
// ConfirmModal - простое подтверждение (да/отмена).
import ModalShell from './ModalShell.vue';
import { answerDialog } from '../viewmodels/useKanbanViewModel.js';

defineProps({ message: { type: String, required: true } });
</script>

<template>
    <ModalShell @cancel="answerDialog(false)">
        <h3>Подтверждение</h3>
        <p>{{ message }}</p>
        <div class="modal-actions">
            <button class="btn primary" @click="answerDialog(true)">Да</button>
            <button class="btn" @click="answerDialog(false)">Отмена</button>
        </div>
    </ModalShell>
</template>
