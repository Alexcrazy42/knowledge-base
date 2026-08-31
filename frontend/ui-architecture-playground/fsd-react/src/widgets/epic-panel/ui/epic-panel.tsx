// ============================================================================
// EpicPanel - виджет панели эпиков: список с прогресс-барами + удаление
// выбранного. Прогресс считает фича manage-epics (buildEpicRows) -
// компонент только рисует и сообщает о кликах.
// ============================================================================

import type { EpicRowVM } from '@/features/manage-epics';

interface EpicPanelProps {
    rows: EpicRowVM[];
    selectedId: string | null;                       // epic.id выбранной строки
    onSelect: (row: EpicRowVM) => void;
    onDeleteRequest: (row: EpicRowVM) => void;
}

export function EpicPanel({ rows, selectedId, onSelect, onDeleteRequest }: EpicPanelProps) {
    const hasSelection = selectedId !== null;
    return (
        <aside className="epic-panel">
            <h2>Эпики</h2>
            {rows.length === 0 && (
                <p className="empty small">Пока нет эпиков.<br />«+ Эпик» или «Тест-эпик» сверху.</p>
            )}
            <ul>
                {rows.map(row => (
                    <li
                        key={row.epic.id}
                        className={`epic-row${selectedId === row.epic.id ? ' selected' : ''}`}
                        onClick={() => onSelect(row)}
                    >
                        <span className="epic-label">{row.label}</span>
                        {/* gherkin: прогресс эпика "2/5 (40%)" */}
                        <progress value={row.progress} max={1} />
                    </li>
                ))}
            </ul>
            <button
                className="btn danger wide"
                disabled={!hasSelection}
                onClick={() => {
                    const row = rows.find(r => r.epic.id === selectedId);
                    if (row) onDeleteRequest(row);
                }}
            >
                Удалить выбранный эпик
            </button>
        </aside>
    );
}
