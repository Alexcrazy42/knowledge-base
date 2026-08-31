// ============================================================================
// KanbanBoard - виджет доски: три колонки с карточками и DnD.
// Индекс вставки при перетаскивании колонка считает САМА по координатам -
// наверх уходит готовый (taskId, targetState, index), как в Vue-версии.
// Карточки - TaskCard из entities/task (виджет может использовать entities).
// ============================================================================

import type { DragEvent } from 'react';
import { TaskCard } from '@/entities/task';
import type { TaskCardVM } from '@/entities/task';
import type { KanbanColumnVM } from '@/features/filter-tasks';

interface KanbanBoardProps {
    columns: KanbanColumnVM[];
    onAdd: (state: KanbanColumnVM['state']) => void;
    onEdit: (card: TaskCardVM) => void;
    onDelete: (card: TaskCardVM) => void;
    onMove: (taskId: string, targetState: KanbanColumnVM['state'], targetIndex: number) => void;
}

export function KanbanBoard({ columns, onAdd, onEdit, onDelete, onMove }: KanbanBoardProps) {
    return (
        <div className="columns">
            {columns.map(column => (
                <Column
                    key={column.state}
                    column={column}
                    onAdd={onAdd}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMove={onMove}
                />
            ))}
        </div>
    );
}

interface ColumnProps {
    column: KanbanColumnVM;
    onAdd: (state: KanbanColumnVM['state']) => void;
    onEdit: (card: TaskCardVM) => void;
    onDelete: (card: TaskCardVM) => void;
    onMove: (taskId: string, targetState: KanbanColumnVM['state'], targetIndex: number) => void;
}

function Column({ column, onAdd, onEdit, onDelete, onMove }: ColumnProps) {
    const onDrop = (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/task-id');
        if (!taskId) return;
        // считаем индекс вставки: сколько карточек выше курсора
        const cards = Array.from(e.currentTarget.querySelectorAll('.task-card'));
        let index = cards.length;
        for (let i = 0; i < cards.length; i++) {
            const box = cards[i].getBoundingClientRect();
            if (e.clientY < box.top + box.height / 2) {
                index = i;
                break;
            }
        }
        onMove(taskId, column.state, index);
    };

    const onDragOver = (e: DragEvent<HTMLElement>) => {
        e.preventDefault();                              // разрешаем drop
        e.dataTransfer.dropEffect = 'move';
    };

    return (
        <section className="column">
            <h3>{column.title} ({column.cards.length})</h3>

            <div className="cards" onDrop={onDrop} onDragOver={onDragOver}>
                {column.cards.length === 0 && <p className="empty small">Перетащите задачу сюда</p>}
                {column.cards.map(card => (
                    <TaskCard
                        key={card.task.id}
                        card={card}
                        onEdit={() => onEdit(card)}
                        onDelete={() => onDelete(card)}
                    />
                ))}
            </div>

            {/* Подпись "+ Задача" - как во всех версиях (ищут UI-тесты). */}
            <button className="btn wide" onClick={() => onAdd(column.state)}>+ Задача</button>
        </section>
    );
}
