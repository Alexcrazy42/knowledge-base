import { Component, inject, signal } from '@angular/core';
import { KanbanViewModel } from './viewmodels/kanban.viewmodel';
import { TopBarComponent } from './components/top-bar.component';
import { EpicPanelComponent, EpicRow } from './components/epic-panel.component';
import { KanbanColumnComponent } from './components/kanban-column.component';
import { ModalsHostComponent } from './components/modals-host.component';
import { UsersModalComponent } from './components/users-modal.component';

// ============================================================================
// App (корневая View). Слои MVVM:
//   Model      - BoardStoreService (+domain/models.ts)
//   ViewModel  - KanbanViewModel (сигналы + команды)
//   View       - этот шаблон и дочерние компоненты: только биндинги
// Никаких вызовов «перерисуй» в коде нет: изменение сигнала само
// перерисовывает зависимые места шаблона.
// ============================================================================

@Component({
    selector: 'app-root',
    imports: [
        TopBarComponent,
        EpicPanelComponent,
        KanbanColumnComponent,
        ModalsHostComponent,
        UsersModalComponent,
    ],
    templateUrl: './app.html',
})
export class App {
    /** VM инжектируется как сервис - единый экземпляр на приложение. */
    readonly vm = inject(KanbanViewModel);

    /** Локальное UI-состояние: выделенный эпик + открытая модалка пользователей. */
    readonly selectedEpic = signal<EpicRow | null>(null);
    readonly showUsers = signal(false);
}
