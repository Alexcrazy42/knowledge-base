<script setup>
// Верхняя панель: работа с досками, сиды, экспорт/импорт/сброс.
// Только проброска команд VM - логики нет.
const props = defineProps({ vm: { type: Object, required: true } });
defineEmits(['open-users']);
</script>

<template>
    <header class="top-bar">
        <select :value="props.vm.currentBoardId.value"
                @change="props.vm.currentBoardId.value = $event.target.value" class="input board-select">
            <option v-for="b in props.vm.boards.value" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <button class="btn" @click="props.vm.createBoard()">+ Доска</button>
        <button class="btn" :disabled="!props.vm.currentBoard.value" @click="props.vm.renameBoard()">&#9998; Переименовать</button>
        <button class="btn danger" :disabled="!props.vm.currentBoard.value" @click="props.vm.deleteBoard()">&#128465; Удалить</button>

        <span class="divider"></span>

        <button class="btn" :disabled="!props.vm.currentBoard.value" title="Эпик + 5 задач с дедлайнами (проверка overdue)"
                @click="props.vm.seedTestEpic()">Тест-эпик &#129514;</button>
        <button class="btn" :disabled="!props.vm.currentBoard.value" title="10 случайных задач (40/30/30)"
                @click="props.vm.seedRandomTasks()">+ 10 задач</button>
        <button class="btn" :disabled="!props.vm.currentBoard.value" @click="props.vm.createEpic()">+ Эпик</button>

        <span class="divider"></span>

        <button class="btn" @click="props.vm.exportJson()">Экспорт JSON</button>
        <button class="btn" @click="props.vm.importJson()">Импорт</button>
        <button class="btn danger" @click="props.vm.resetAll()">Сброс всего</button>
        <button class="btn primary right" @click="$emit('open-users')">Пользователи</button>
    </header>
</template>
