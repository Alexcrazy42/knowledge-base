// ============================================================================
// KanbanColumnComponent - колонка канбана вместе с карточками.
// Карточки - разметка внутри колонки: отдельный компонент не нужен,
// данные приходят готовыми (CardVm из VM). DnD - единственный жест:
// индекс вставки считаем по координатам и отдаём наверх готовую команду.
// ============================================================================

import { Component, input, output } from '@angular/core';
import { CardVm } from '../viewmodels/kanban.viewmodel';
import { TaskState } from '../domain/models';

@Component({
    selector: 'app-kanban-column',
    template: `
        <div class="column">
            <h3>{{ column().title }} ({{ column().cards.length }})</h3>

            <div class="cards" (drop)="onDrop($event)" (dragover)="onDragOver($event)">
                @if (column().cards.length === 0) {
                    <p class="empty small">Перетащите задачу сюда</p>
                }
                @for (card of column().cards; track card.task.id) {
                    <article class="task-card" [class.overdue]="card.overdue"
                             draggable="true"
                             (dragstart)="onDragStart($event, card)">
                        <div class="card-head">
                            <span class="key">{{ card.key }}</span>
                            @if (card.epicKey) {<span class="epic-chip">{{ card.epicKey }}</span>}
                        </div>
                        <h4 class="title">{{ card.task.title }}</h4>
                        @if (card.task.description) {<p class="desc">{{ card.task.description }}</p>}
                        <div class="meta">
                            <span [class]="'chip prio-' + card.task.priority">{{ card.priorityLabel }}</span>
                            <span class="chip type">{{ card.typeLabel }}</span>
                        </div>
                        <div class="footer-row">
                            <span class="assignee">{{ card.assignee }}</span>
                            @if (card.task.deadline) {
                                <time class="deadline" [class.text-red]="card.overdue">
                                    &#9200; {{ formatDate(card.task.deadline) }}
                                </time>
                            }
                        </div>
                        <div class="actions">
                            <button class="icon-btn" title="Редактировать" (click)="edit.emit(card)">&#9998;</button>
                            <button class="icon-btn danger" title="Удалить" (click)="remove.emit(card)">&#128465;</button>
                        </div>
                    </article>
                }
            </div>

            <!-- Добавление в конкретную колонку: состояние уходит параметром команды -->
            <button class="btn wide" (click)="add.emit(column().state)">+ Задача</button>
        </div>
    `,
})
export class KanbanColumnComponent {
    column = input.required<{ state: TaskState; title: string; cards: CardVm[] }>();

    add = output<TaskState>();
    edit = output<CardVm>();
    remove = output<CardVm>();
    /** (taskId, state, insertIndex) - готовые аргументы vm.moveTask */
    dropTask = output<{ taskId: string; state: TaskState; index: number }>();

    onDragStart(e: DragEvent, card: CardVm): void {
        e.dataTransfer?.setData('text/task-id', card.task.id);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    }

    onDragOver(e: DragEvent): void {
        e.preventDefault();                              // разрешаем drop
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }

    onDrop(e: DragEvent): void {
        e.preventDefault();
        const taskId = e.dataTransfer?.getData('text/task-id');
        if (!taskId) return;

        // индекс вставки: сколько карточек выше курсора
        const host = e.currentTarget as HTMLElement;
        const cards = Array.from(host.querySelectorAll('.task-card'));
        let index = cards.length;
        for (let i = 0; i < cards.length; i++) {
            const box = cards[i].getBoundingClientRect();
            if (e.clientY < box.top + box.height / 2) { index = i; break; }
        }
        this.dropTask.emit({ taskId, state: this.column().state, index });
    }

    formatDate(iso: string): string {
        return new Date(iso + 'T00:00:00')
            .toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
}
