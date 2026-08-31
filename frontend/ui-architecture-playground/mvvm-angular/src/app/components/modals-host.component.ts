// ============================================================================
// ModalsHostComponent - единственное место, где promise-диалоги становятся
// DOM. Читает DialogService.current() и рисует окно нужного типа.
//
// Форма задачи содержит локальную мини-VM: reactive-подобный объект формы +
// computed error/canSave. Кнопка «Сохранить» серая при невалидных данных -
// цикл валидации из gherkin (пустой заголовок не даёт закрыть диалог).
// ============================================================================

import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../dialogs/dialog.service';
import {
    FILTER_NONE, Priority, TaskState, WorkItemType,
    PRIORITY_TITLES, STATE_TITLES, TYPE_TITLES,
} from '../domain/models';

@Component({
    imports: [FormsModule],
    selector: 'app-modals-host',
    template: `
        @if (dialogs.current(); as d) {

            <!-- ============ PROMPT (однострочный ввод, режим слова СБРОС) ============ -->
            @if (d.kind === 'prompt') {
                <div class="overlay" (click)="cancel()">
                    <div class="modal" (click)="$event.stopPropagation()">
                        <h3>{{ d.title }}</h3>
                        <label class="field-label">{{ d.label }}</label>
                        <input class="input" [(ngModel)]="promptValue" autofocus
                               (keydown.enter)="confirmPrompt()"/>
                        @if (d.confirmWord) {
                            <p class="hint danger">Для подтверждения введите слово {{ d.confirmWord }}</p>
                        }
                        <div class="modal-actions">
                            <button class="btn primary" (click)="confirmPrompt()">OK</button>
                            <button class="btn" (click)="cancel()">Отмена</button>
                        </div>
                    </div>
                </div>
            }

            <!-- ============ CONFIRM ============ -->
            @if (d.kind === 'confirm') {
                <div class="overlay" (click)="dialogs.answer(false)">
                    <div class="modal" (click)="$event.stopPropagation()">
                        <h3>Подтверждение</h3>
                        <p>{{ d.message }}</p>
                        <div class="modal-actions">
                            <button class="btn primary" (click)="dialogs.answer(true)">Да</button>
                            <button class="btn" (click)="dialogs.answer(false)">Отмена</button>
                        </div>
                    </div>
                </div>
            }

            <!-- ============ EPIC DELETE ============ -->
            @if (d.kind === 'epicDelete') {
                <div class="overlay" (click)="dialogs.answer(null)">
                    <div class="modal" (click)="$event.stopPropagation()">
                        <h3>Удаление {{ d.epicKey }}</h3>
                        <p>Удалить {{ d.epicKey }} «{{ d.epicTitle }}»?</p>
                        @if (d.taskCount > 0) {
                            <p class="hint">С эпиком связано {{ d.taskCount }} задач(и). Что с ними сделать?</p>
                        }
                        <div class="modal-actions column">
                            <button class="btn wide"
                                    (click)="dialogs.answer('detach')">
                                Удалить эпик{{ d.taskCount ? ', задачи оставить' : '' }}
                            </button>
                            <button class="btn danger wide" [disabled]="d.taskCount === 0"
                                    (click)="dialogs.answer('cascade')">
                                Удалить эпик и {{ d.taskCount }} задач(и)
                            </button>
                            <button class="btn wide" (click)="dialogs.answer(null)">Отмена</button>
                        </div>
                    </div>
                </div>
            }

            <!-- ============ TASK EDIT/CREATE ============ -->
            @if (d.kind === 'task') {
                <div class="overlay" (click)="dialogs.answer(null)">
                    <div class="modal" (click)="$event.stopPropagation()">
                        <h3>{{ d.existing ? 'Редактирование задачи' : 'Новая задача' }}</h3>

                        <label class="field-label">Заголовок *</label>
                        <input class="input" [(ngModel)]="taskForm.title"/>

                        <label class="field-label">Описание</label>
                        <textarea class="input" rows="4" [(ngModel)]="taskForm.description"></textarea>

                        <div class="form-grid">
                            <div>
                                <label class="field-label">Статус</label>
                                <select class="input" [(ngModel)]="taskForm.state">
                                    @for (o of stateOptions; track o.value) {
                                        <option [value]="o.value">{{ o.label }}</option>
                                    }
                                </select>
                            </div>
                            <div>
                                <label class="field-label">Тип</label>
                                <select class="input" [(ngModel)]="taskForm.type">
                                    @for (o of typeOptions; track o.value) {
                                        <option [value]="o.value">{{ o.label }}</option>
                                    }
                                </select>
                            </div>
                            <div>
                                <label class="field-label">Приоритет</label>
                                <select class="input" [(ngModel)]="taskForm.priority">
                                    @for (o of priorityOptions; track o.value) {
                                        <option [value]="o.value">{{ o.label }}</option>
                                    }
                                </select>
                            </div>
                            <div>
                                <label class="field-label">Дедлайн</label>
                                <input type="date" class="input" [(ngModel)]="taskForm.deadline"/>
                            </div>
                        </div>

                        <label class="field-label">Исполнитель</label>
                        <select class="input" [(ngModel)]="taskForm.assigneeId">
                            <option [value]="FILTER_NONE">(без исполнителя)</option>
                            @for (u of d.users; track u.id) {
                                <option [value]="u.id">{{ u.label }}</option>
                            }
                        </select>

                        <label class="field-label">Эпик</label>
                        <select class="input" [(ngModel)]="taskForm.epicId">
                            <option [value]="FILTER_NONE">(без эпика)</option>
                            @for (e of d.epics; track e.id) {
                                <option [value]="e.id">{{ e.label }}</option>
                            }
                        </select>

                        <!-- Ошибка и состояние кнопки - геттеры мини-VM формы -->
                        @if (error; as err) {<p class="hint danger">{{ err }}</p>}

                        <div class="modal-actions">
                            <button class="btn primary" [disabled]="!canSave" (click)="saveTask(d)">
                                Сохранить
                            </button>
                            <button class="btn" (click)="dialogs.answer(null)">Отмена</button>
                        </div>
                    </div>
                </div>
            }
        }
    `,
})
export class ModalsHostComponent {
    readonly dialogs = inject(DialogService);

    // локальное состояние prompt-диалога; пересоздаётся при каждом открытии
    promptValue = '';

    /**
     * Локальная "форма задачи" - мини-VM диалога.
     * ВАЖНО (Angular-ловушка): это ОБЫЧНОЕ поле, а не signal!
     * Биндинг [(ngModel)]="form.title" мутирует объект; если бы объект
     * лежал в signal, мутация НЕ уведомила бы подписчиков и computed-
     * валидация никогда бы не пересчиталась. Обычные поля + zone.js-CD
     * пересчитывают геттеры error/canSave на каждое событие ввода.
     */
    taskForm = {
        title: '', description: '',
        assigneeId: FILTER_NONE as string | null,
        epicId: FILTER_NONE as string | null,
        state: TaskState.ToDo as TaskState,
        type: WorkItemType.Task as WorkItemType,
        priority: Priority.Medium as Priority,
        deadline: '' as string | null,
    };

    readonly stateOptions = Object.values(TaskState).map(v => ({ value: v, label: STATE_TITLES[v] }));
    readonly typeOptions = Object.values(WorkItemType).map(v => ({ value: v, label: TYPE_TITLES[v] }));
    readonly priorityOptions = Object.values(Priority).map(v => ({ value: v, label: PRIORITY_TITLES[v] }));
    protected readonly FILTER_NONE = FILTER_NONE;

    // При открытии диалога инициализируем локальные данные
    constructor() {
        effect(() => {
            const d = this.dialogs.current();
            if (!d) return;
            if (d.kind === 'prompt') this.promptValue = d.initial ?? '';
            if (d.kind === 'task') {
                const ex = d.existing;
                this.taskForm = {
                    title: ex?.title ?? '',
                    description: ex?.description ?? '',
                    assigneeId: ex?.assigneeId ?? FILTER_NONE,
                    epicId: ex?.epicId ?? FILTER_NONE,
                    state: ex?.state ?? d.defaultState,
                    type: ex?.type ?? WorkItemType.Task,
                    priority: ex?.priority ?? Priority.Medium,
                    deadline: ex?.deadline ?? '',
                };
            }
        });
    }

    confirmPrompt(): void {
        const d = this.dialogs.current();
        if (d?.kind !== 'prompt') return;
        if (d.confirmWord && this.promptValue.trim() !== d.confirmWord) return;   // слово СБРОС
        this.dialogs.answer(this.promptValue);
    }

    cancel(): void {
        this.dialogs.answer(null);
    }

    // ----- валидация формы задачи как геттеры (CD пересчитает на событие) -----
    get error(): string {
        const f = this.taskForm;
        if (!f.title.trim()) return 'Заголовок обязателен';
        return '';
    }

    get canSave(): boolean {
        return this.error === '';
    }

    saveTask(_d: unknown): void {
        if (!this.canSave) return;
        const f = this.taskForm;
        this.dialogs.answer({
            title: f.title.trim(),
            description: f.description.trim(),
            assigneeId: f.assigneeId === FILTER_NONE ? null : f.assigneeId,
            epicId: f.epicId === FILTER_NONE ? null : f.epicId,
            state: f.state,
            type: f.type,
            priority: f.priority,
            deadline: f.deadline || null,
        });
    }
}
