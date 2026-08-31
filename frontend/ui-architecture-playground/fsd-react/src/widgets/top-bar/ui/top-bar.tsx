// ============================================================================
// TopBar - виджет верхней панели: доски, сиды, экспорт/импорт/сброс.
// Виджет в FSD - КОМПОЗИЦИЯ сущностей и фич для крупного блока экрана.
// Здесь только проброс команд наверх - логики нет (как TopBar.vue).
// ============================================================================

import type { Board } from '@/entities/board';

interface TopBarProps {
    boards: Board[];
    currentBoardId: string | null;

    onBoardSelect: (id: string) => void;
    onCreateBoard: () => void;
    onRenameBoard: () => void;
    onDeleteBoard: () => void;

    onSeedTestEpic: () => void;
    onSeedRandomTasks: () => void;
    onCreateEpic: () => void;

    onExportJson: () => void;
    onImportJson: () => void;
    onResetAll: () => void;

    onOpenUsers: () => void;
}

export function TopBar(props: TopBarProps) {
    const noBoard = props.currentBoardId === null;   // gherkin: без доски команды недоступны
    return (
        <header className="top-bar">
            <select
                className="input board-select"
                value={props.currentBoardId ?? ''}
                onChange={e => props.onBoardSelect(e.target.value)}
            >
                {props.boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button className="btn" onClick={props.onCreateBoard}>+ Доска</button>
            <button className="btn" disabled={noBoard} onClick={props.onRenameBoard}>✎ Переименовать</button>
            <button className="btn danger" disabled={noBoard} onClick={props.onDeleteBoard}>🗑 Удалить</button>

            <span className="divider" />

            {/* Подписи кнопок совпадают с Vue/Angular - e2e переносимы между версиями */}
            <button className="btn" disabled={noBoard}
                    title="Эпик + 5 задач с дедлайнами (проверка overdue)"
                    onClick={props.onSeedTestEpic}>
                Тест-эпик 🧪
            </button>
            <button className="btn" disabled={noBoard}
                    title="10 случайных задач (40/30/30)"
                    onClick={props.onSeedRandomTasks}>
                + 10 задач
            </button>
            <button className="btn" disabled={noBoard} onClick={props.onCreateEpic}>+ Эпик</button>

            <span className="divider" />

            <button className="btn" onClick={props.onExportJson}>Экспорт JSON</button>
            <button className="btn" onClick={props.onImportJson}>Импорт</button>
            <button className="btn danger" onClick={props.onResetAll}>Сброс всего</button>
            <button className="btn primary right" onClick={props.onOpenUsers}>Пользователи</button>
        </header>
    );
}
