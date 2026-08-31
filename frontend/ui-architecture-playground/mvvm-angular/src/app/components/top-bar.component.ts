// ============================================================================
// TopBarComponent - View верхней панели. Только биндинги к методам VM:
// ни одного обращения к стору или домену. disabled кнопок - computed VM.
//
// Нюанс Angular-сигналов: input.required<T>() - это InputSignal, поэтому
// в шаблоне разворачиваем вызовом vm(): vm().createBoard().
// ============================================================================

import { Component, input, output } from '@angular/core';
import { KanbanViewModel } from '../viewmodels/kanban.viewmodel';

@Component({
    selector: 'app-top-bar',
    template: `
        <select class="input board-select" [value]="vm().currentBoardId() ?? ''"
                (change)="vm().currentBoardId.set($any($event.target).value || null)">
            @for (b of vm().boards(); track b.id) {
                <option [value]="b.id" [selected]="b.id === vm().currentBoardId()">{{ b.name }}</option>
            }
        </select>

        <button class="btn" (click)="vm().createBoard()">+ Доска</button>
        <button class="btn" [disabled]="!vm().currentBoard()" (click)="vm().renameBoard()">&#9998; Переименовать</button>
        <button class="btn danger" [disabled]="!vm().currentBoard()" (click)="vm().deleteBoard()">&#128465; Удалить</button>

        <span class="divider"></span>

        <button class="btn" [disabled]="!vm().currentBoard()"
                title="Эпик + 5 задач с дедлайнами (проверка overdue)"
                (click)="vm().seedTestEpic()">Тест-эпик &#129514;</button>
        <button class="btn" [disabled]="!vm().currentBoard()" title="10 случайных задач (40/30/30)"
                (click)="vm().seedRandomTasks()">+ 10 задач</button>
        <button class="btn" [disabled]="!vm().currentBoard()" (click)="vm().createEpic()">+ Эпик</button>

        <span class="divider"></span>

        <button class="btn" (click)="vm().exportJson()">Экспорт JSON</button>
        <button class="btn" (click)="vm().importJson()">Импорт</button>
        <button class="btn danger" (click)="vm().resetAll()">Сброс всего</button>
        <button class="btn primary right" (click)="openUsers.emit()">Пользователи</button>
    `,
})
export class TopBarComponent {
    /** Вся View получает ОДИН объект - ViewModel. */
    readonly vm = input.required<KanbanViewModel>();
    openUsers = output<void>();
}
