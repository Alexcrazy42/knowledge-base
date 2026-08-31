// ============================================================================
// BoardPage - сборка экрана из виджетов и фич.
// Шаблон повторяет App.vue: top-bar -> filter-bar -> workspace(эпики+колонки)
// -> статус-бар -> модалки. Логики нет - только композиция и проброс команд.
// ============================================================================

import { useBoardPage } from '../model/use-board-page';
import { TopBar } from '@/widgets/top-bar';
import { EpicPanel } from '@/widgets/epic-panel';
import { KanbanBoard } from '@/widgets/kanban-board';
import { FilterBar } from '@/features/filter-tasks';
import { UsersModal } from '@/features/manage-users';

export function BoardPage() {
    const page = useBoardPage();

    return (
        <div className="app">
            {/* Верхняя панель получает команды через props-колбэки */}
            <TopBar
                boards={page.boards}
                currentBoardId={page.currentBoardId}
                onBoardSelect={page.setCurrentBoardId}
                onCreateBoard={page.boardCommands.createBoard}
                onRenameBoard={() => page.boardCommands.renameBoard(page.currentBoardId)}
                onDeleteBoard={() => page.boardCommands.deleteBoard(page.currentBoardId)}
                onSeedTestEpic={() => page.epicCommands.seedTestEpic(page.currentBoardId)}
                onSeedRandomTasks={() => page.epicCommands.seedRandomTasks(page.currentBoardId)}
                onCreateEpic={() => page.epicCommands.createEpic(page.currentBoardId)}
                onExportJson={page.dataCommands.exportJson}
                onImportJson={page.dataCommands.importJson}
                onResetAll={page.dataCommands.resetAll}
                onOpenUsers={() => page.setUsersOpen(true)}
            />

            <FilterBar
                criteria={page.criteria}
                onChange={page.setCriteria}
                assigneeOptions={page.assigneeOptions}
                epicOptions={page.epicOptions}
            />

            <div className="workspace">
                <EpicPanel
                    rows={page.epicRows}
                    selectedId={page.selectedEpicId}
                    onSelect={row => page.setSelectedEpicId(row.epic.id)}
                    onDeleteRequest={row => page.epicCommands.deleteSelectedEpic(page.currentBoardId, row)}
                />

                <main className="board-area">
                    {!page.currentBoard && (
                        <p className="empty">Создайте первую доску кнопкой «+ Доска»</p>
                    )}
                    {page.currentBoard && (
                        <KanbanBoard
                            columns={page.columns}
                            onAdd={state => page.taskCommands.openTaskEditor(page.currentBoardId, null, state)}
                            onEdit={card => page.taskCommands.openTaskEditor(page.currentBoardId, card.task.id)}
                            onDelete={card => page.taskCommands.deleteCard(page.currentBoardId, card)}
                            onMove={(taskId, targetState, targetIndex) =>
                                page.taskCommands.moveTask(page.currentBoardId, taskId, targetState, targetIndex)}
                        />
                    )}
                </main>
            </div>

            {/* Flash-сообщение */}
            <footer className="status-bar">{page.flashText}</footer>

            {/* Модалка пользователей - локальное состояние страницы */}
            {page.usersOpen && <UsersModal onClose={() => page.setUsersOpen(false)} />}
        </div>
    );
}
