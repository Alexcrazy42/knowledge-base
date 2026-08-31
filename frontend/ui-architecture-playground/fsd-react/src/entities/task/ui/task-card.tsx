// ============================================================================
// Карточка задачи - presentational-компонент сущности "Задача".
// Данные приходят готовыми (TaskCardVM): компонент не знает ни про стор,
// ни про пользователей/эпики. Drag - единственный "жест", который он знает;
// расчёт индекса вставки делает колонка (widgets/kanban-board).
// ============================================================================

import type { DragEvent } from 'react';
import type { TaskCardVM } from '../model/card';

interface TaskCardProps {
    card: TaskCardVM;
    onEdit: () => void;
    onDelete: () => void;
}

export function TaskCard({ card, onEdit, onDelete }: TaskCardProps) {
    const onDragStart = (e: DragEvent<HTMLElement>) => {
        e.dataTransfer.setData('text/task-id', card.task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <article className={`task-card${card.overdue ? ' overdue' : ''}`} draggable onDragStart={onDragStart}>
            <div className="card-head">
                <span className="key">{card.key}</span>
                {card.epicKey && <span className="epic-chip">{card.epicKey}</span>}
            </div>
            <h4 className="title">{card.task.title}</h4>
            {card.task.description && <p className="desc">{card.task.description}</p>}
            <div className="meta">
                <span className={`chip prio-${card.task.priority}`}>{card.priorityLabel}</span>
                <span className="chip type">{card.typeLabel}</span>
            </div>
            <div className="footer-row">
                <span className="assignee">{card.assignee}</span>
                {card.deadlineLabel && <time className="deadline">{'⏰'} {card.deadlineLabel}</time>}
            </div>
            <div className="actions">
                <button className="icon-btn" title="Редактировать" onClick={onEdit}>✎</button>
                <button className="icon-btn danger" title="Удалить" onClick={onDelete}>🗑</button>
            </div>
        </article>
    );
}
