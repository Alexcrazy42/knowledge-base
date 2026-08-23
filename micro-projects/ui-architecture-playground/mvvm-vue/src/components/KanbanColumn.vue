<script setup>
// Колонка канбана: заголовок со счётчиком, карточки, зона DnD, кнопка «+».
// Индекс вставки при перетаскивании колонка считает САМА по координатам -
// VM получает готовый (taskId, state, index).
import TaskCard from './TaskCard.vue';

const props = defineProps({ column: { type: Object, required: true } });
const emit = defineEmits(['add', 'edit', 'delete', 'drop-task']);

function onDrop(e) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/task-id');
    if (!taskId) return;
    // считаем индекс вставки: сколько карточек выше курсора
    const cards = [...e.currentTarget.querySelectorAll('.task-card')];
    let index = cards.length;
    for (let i = 0; i < cards.length; i++) {
        const box = cards[i].getBoundingClientRect();
        if (e.clientY < box.top + box.height / 2) { index = i; break; }
    }
    emit('drop-task', taskId, props.column.state, index);
}

function onDragOver(e) {
    e.preventDefault();                                  // разрешаем drop
    e.dataTransfer.dropEffect = 'move';
}
</script>

<template>
    <section class="column">
        <h3>{{ column.title }} ({{ column.cards.length }})</h3>

        <div class="cards" @drop="onDrop" @dragover="onDragOver">
            <p v-if="column.cards.length === 0" class="empty small">Перетащите задачу сюда</p>
            <TaskCard v-for="card in column.cards" :key="card.task.id" :card="card"
                      @edit="$emit('edit', card)" @delete="$emit('delete', card)"/>
        </div>

        <button class="btn wide" @click="$emit('add')">+ Задача</button>
    </section>
</template>
