// ============================================================================
// UsersModalComponent - экран пользователей (двухшаговый, как в Vue-версии):
//   шаг 1 - список + добавление/удаление;
//   шаг 2 - при незавершённых задачах: кому передать.
// Логика локальна и работает через стор: реактивность сигналов сама
// обновит канбан позади модалки (никаких onChanged-колбэков из MVP).
// ============================================================================

import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BoardStoreService } from '../domain/board-store.service';
import { TaskState } from '../domain/models';

interface UserRow {
    user: { id: string; name: string };
    open: number;
    summary: string;
}

@Component({
    imports: [FormsModule],
    selector: 'app-users-modal',
    template: `
        <div class="overlay" (click)="closed.emit()">
            <div class="modal" (click)="$event.stopPropagation()">

                <!-- ШАГ 1: список пользователей -->
                @if (step() === 'list') {
                    <h3>Пользователи</h3>
                    <ul class="user-list">
                        @for (row of rows(); track row.user.id) {
                            <li [class.hasOpen]="row.open > 0">
                                <span class="user-name">{{ row.user.name }}</span>
                                <span class="user-summary">{{ row.summary }}</span>
                                <button class="icon-btn danger" title="Удалить"
                                        (click)="requestDelete(row)">&#128465;</button>
                            </li>
                        }
                    </ul>
                    @if (rows().length === 0) {<p class="empty small">Пока никого нет.</p>}

                    <div class="inline-form">
                        <input class="input grow" placeholder="Имя нового пользователя"
                               [(ngModel)]="newName" (keydown.enter)="addUser()"/>
                        <button class="btn primary" (click)="addUser()">Добавить</button>
                    </div>
                    <p class="hint danger">{{ flash() }}</p>
                }

                <!-- ШАГ 2: перенос незавершённых задач -->
                @if (step() === 'reassign' && pending(); as p) {
                    <h3>Перенос задач</h3>
                    <p>У «{{ p.row.user.name }}» {{ p.row.open }} незавершённых задач(и).</p>
                    <label class="field-label">Кому передать?</label>
                    <select class="input" [(ngModel)]="reassignChoice">
                        @for (u of p.others; track u.id) {
                            <option [value]="u.id">{{ u.name }}</option>
                        }
                    </select>
                    <div class="modal-actions">
                        <button class="btn primary" (click)="confirmReassign()">Перенести и удалить</button>
                        <button class="btn" (click)="step.set('list')">Назад</button>
                    </div>
                }

                <div class="modal-actions">
                    <button class="btn wide" (click)="closed.emit()">Закрыть</button>
                </div>
            </div>
        </div>
    `,
})
export class UsersModalComponent {
    readonly store = inject(BoardStoreService);
    readonly closed = output<void>();

    readonly step = signal<'list' | 'reassign'>('list');
    readonly newName = signal('');
    readonly flash = signal('');
    readonly pending = signal<{ row: UserRow; others: { id: string; name: string }[] } | null>(null);
    reassignChoice = '';

    // Статистика по задачам всех досок (как UsersViewModel.Refresh в C#)
    readonly rows = computed<UserRow[]>(() => {
        const openByUser = new Map<string, number>();
        const totalByUser = new Map<string, number>();
        for (const b of this.store.boards())
            for (const t of b.tasks) {
                if (!t.assigneeId) continue;
                totalByUser.set(t.assigneeId, (totalByUser.get(t.assigneeId) ?? 0) + 1);
                if (t.state !== TaskState.Done)
                    openByUser.set(t.assigneeId, (openByUser.get(t.assigneeId) ?? 0) + 1);
            }
        return this.store.users().map(u => ({
            user: u,
            open: openByUser.get(u.id) ?? 0,
            summary: `${totalByUser.get(u.id) ?? 0} задач всего`,
        }));
    });

    addUser(): void {
        const name = this.newName().trim();
        if (!name) { this.flash.set('Имя обязательно'); return; }
        if (this.store.users().some(u => u.name.toLowerCase() === name.toLowerCase())) {
            this.flash.set(`Пользователь «${name}» уже есть`);
            return;
        }
        this.store.addUser(name);
        this.newName.set('');
        this.flash.set(`«${name}» добавлен(а)`);
    }

    requestDelete(row: UserRow): void {
        const others = this.store.users()
            .filter(u => u.id !== row.user.id)
            .map(u => ({ id: u.id, name: u.name }));

        if (row.open > 0 && others.length > 0) {
            this.pending.set({ row, others });
            this.reassignChoice = others[0].id;
            this.step.set('reassign');
            return;
        }
        this.doDelete(row, null);
    }

    confirmReassign(): void {
        const p = this.pending();
        if (!p) return;
        this.doDelete(p.row, this.reassignChoice);
    }

    private doDelete(row: UserRow, reassignTo: string | null): void {
        if (row.open > 0 && !reassignTo) {
            this.flash.set(`У «${row.user.name}» ${row.open} активных задач, но некому их передать.`);
            this.step.set('list');
            this.pending.set(null);
            return;
        }
        this.store.deleteUser(row.user.id, reassignTo);
        this.step.set('list');
        this.pending.set(null);
        this.flash.set(reassignTo
            ? `«${row.user.name}» удалён(а), задачи перенесены`
            : `«${row.user.name}» удалён(а)`);
    }
}
