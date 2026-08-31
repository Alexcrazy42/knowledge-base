<script setup>
// Панель эпиков: список с прогресс-барами + удаление выбранного.
// Прогресс считает VM (computed) - компонент только рисует.
import { computed } from 'vue';

const props = defineProps({
    epics: { type: Array, required: true },
    selected: { type: Object, default: null },
});
const emit = defineEmits(['update:selected', 'delete']);

const hasSelection = computed(() => props.selected !== null);
</script>

<template>
    <aside class="epic-panel">
        <h2>Эпики</h2>
        <p v-if="epics.length === 0" class="empty small">Пока нет эпиков.<br/>«+ Эпик» или «Тест-эпик» сверху.</p>
        <ul>
            <!-- :class - биндинг стиля от состояния; клик меняет выделение -->
            <li v-for="row in epics" :key="row.epic.id"
                :class="['epic-row', { selected: selected?.epic.id === row.epic.id }]"
                @click="$emit('update:selected', row)">
                <span class="epic-label">{{ row.label }}</span>
                <progress :value="row.progress" max="1"></progress>
            </li>
        </ul>
        <button class="btn danger wide" :disabled="!hasSelection" @click="$emit('delete', selected)">
            Удалить выбранный эпик
        </button>
    </aside>
</template>
