// ============================================================================
// EpicPanelComponent - панель эпиков с прогресс-барами.
// Выделение - model() (двусторонний биндинг, как v-model:selected в Vue).
// ============================================================================

import { Component, input, model, output } from '@angular/core';

export interface EpicRow {
    epic: { id: string; number: number; title: string };
    key: string;
    total: number;
    done: number;
    progress: number;
    label: string;
}

@Component({
    selector: 'app-epic-panel',
    template: `
        <h2>Эпики</h2>
        @if (epics().length === 0) {
            <p class="empty small">Пока нет эпиков.<br/>«+ Эпик» или «Тест-эпик» сверху.</p>
        }
        <ul>
            @for (row of epics(); track row.epic.id) {
                <li class="epic-row"
                    [class.selected]="selected()?.epic?.id === row.epic.id"
                    (click)="selected.set(row)">
                    <span class="epic-label">{{ row.label }}</span>
                    <!-- Прогресс - готовое вычисляемое поле из VM -->
                    <progress [value]="row.progress" max="1"></progress>
                </li>
            }
        </ul>
        @if (selected(); as sel) {
            <button class="btn danger wide" (click)="remove.emit(sel)">
                Удалить выбранный эпик
            </button>
        }
    `,
})
export class EpicPanelComponent {
    epics = input.required<EpicRow[]>();
    selected = model<EpicRow | null>(null);
    remove = output<EpicRow>();
}
