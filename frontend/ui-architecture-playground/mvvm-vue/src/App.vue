<script setup>
// ============================================================================
// App.vue - корневая View. Обратите внимание, чего здесь НЕТ:
//   - логики фильтрации (она в computed у VM)
//   - вызовов стора напрямую (только через команды VM)
//   - кода "перерисуй колонки" (Vue делает это сам при изменении зависимостей)
// Шаблон - это декларативное описание того, КАК данные VM выглядят на экране.
// ============================================================================

import { ref } from 'vue';
import { useKanbanViewModel } from './viewmodels/useKanbanViewModel.js';
import TopBar from './components/TopBar.vue';
import EpicPanel from './components/EpicPanel.vue';
import KanbanColumn from './components/KanbanColumn.vue';
import PromptModal from './components/PromptModal.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import EpicDeleteModal from './components/EpicDeleteModal.vue';
import TaskModal from './components/TaskModal.vue';
import UsersModal from './components/UsersModal.vue';

const vm = useKanbanViewModel();

const selectedEpic = ref(null);          // локальное UI-состояние: какой эпик выделен
const showUsers = ref(false);            // модалка пользователей открыта?
</script>

<template>
    <div class="app">
        <!-- Верхняя панель получает команды VM через props/events -->
        <TopBar :vm="vm" @open-users="showUsers = true"/>

        <!-- Панель фильтров: v-model двусторонне связывает input'ы со свойствами VM.
             Изменили текст -> visibleTasks/columns пересчитались -> канбан обновился.
             Это и есть Data Binding, ради которого существует MVVM. -->
        <div class="filter-bar">
            <input v-model="vm.search.value" placeholder="Поиск по заголовку и описанию" class="input search"/>
            <select v-model="vm.assigneeFilter.value" class="input">
                <option v-for="o in vm.assigneeOptions.value" :key="String(o.id)" :value="o.id">{{ o.label }}</option>
            </select>
            <select v-model="vm.epicFilter.value" class="input">
                <option v-for="o in vm.epicOptions.value" :key="String(o.id)" :value="o.id">{{ o.label }}</option>
            </select>
            <label class="checkbox">
                <input type="checkbox" v-model="vm.sortByPriority.value"/> Сначала High
            </label>
            <button class="btn" @click="vm.resetFilters()">Сбросить фильтры</button>
        </div>

        <div class="workspace">
            <EpicPanel :epics="vm.epicsWithProgress.value"
                       v-model:selected="selectedEpic"
                       @delete="vm.deleteSelectedEpic($event)"/>

            <main class="board-area">
                <p v-if="!vm.currentBoard.value" class="empty">Создайте первую доску кнопкой «+ Доска»</p>
                <div v-else class="columns">
                    <KanbanColumn v-for="col in vm.columns.value" :key="col.state" :column="col"
                                  @add="vm.openTaskEditor(null, col.state)"
                                  @edit="vm.openTaskEditor($event.task)"
                                  @delete="vm.deleteTask($event)"
                                  @drop-task="(...args) => vm.moveTask(...args)"/>
                </div>
            </main>
        </div>

        <!-- Flash-сообщение: обычный bind на свойство VM -->
        <footer class="status-bar">{{ vm.flash.value }}</footer>

        <!-- ================= МОДАЛЬНЫЕ ДИАЛОГИ =================
             Каждый смотрит на dialog.kind и показывает себя;
             ответ возвращается через answerDialog() - VM ждёт промис. -->
        <PromptModal v-if="vm.dialog.kind === 'prompt'" v-bind="vm.dialog.props"/>
        <ConfirmModal v-if="vm.dialog.kind === 'confirm'" v-bind="vm.dialog.props"/>
        <EpicDeleteModal v-if="vm.dialog.kind === 'epicDelete'" v-bind="vm.dialog.props"/>
        <TaskModal v-if="vm.dialog.kind === 'task'" v-bind="vm.dialog.props"/>

        <UsersModal v-if="showUsers" @close="showUsers = false"/>
    </div>
</template>
