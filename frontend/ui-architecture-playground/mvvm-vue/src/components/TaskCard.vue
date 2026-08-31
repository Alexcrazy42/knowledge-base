<script setup>
// Карточка задачи. Данные приходит готовые из VM (toCard) - компонент не лезет
// ни в стор, ни в словари подписей. Drag - единственный "жест", про который
// знает View; логика переноса остаётся в store.moveTask.
import { computed } from 'vue';

const props = defineProps({ card: { type: Object, required: true } });
defineEmits(['edit', 'delete']);

const dragPayload = computed(() => props.card.task.id);

const formatDate = computed(() => {
    const d = new Date(props.card.task.deadline + 'T00:00:00');
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
});
</script>

<template>
    <article class="task-card" :class="{ overdue: card.overdue }"
             draggable="true"
             @dragstart="$event.dataTransfer.setData('text/task-id', dragPayload); $event.dataTransfer.effectAllowed = 'move'">
        <div class="card-head">
            <span class="key">{{ card.key }}</span>
            <span v-if="card.epicKey" class="epic-chip">{{ card.epicKey }}</span>
        </div>
        <h4 class="title">{{ card.task.title }}</h4>
        <p v-if="card.task.description" class="desc">{{ card.task.description }}</p>
        <div class="meta">
            <span :class="['chip', 'prio-' + card.task.priority]">{{ card.priorityLabel }}</span>
            <span class="chip type">{{ card.typeLabel }}</span>
        </div>
        <div class="footer-row">
            <span class="assignee">{{ card.assignee }}</span>
            <time v-if="card.task.deadline" class="deadline">{{ '\u23F0' }} {{ formatDate }}</time>
        </div>
        <div class="actions">
            <button class="icon-btn" title="Редактировать" @click.stop="$emit('edit')">&#9998;</button>
            <button class="icon-btn danger" title="Удалить" @click.stop="$emit('delete')">&#128465;</button>
        </div>
    </article>
</template>
