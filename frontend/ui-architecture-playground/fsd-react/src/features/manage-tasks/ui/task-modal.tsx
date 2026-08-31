// ============================================================================
// TaskModal - диалог создания/редактирования задачи.
//
// Локальная форма - useState (мини-VM диалога, как form ref во Vue-версии);
// валидация выводится в canSave; кнопка «Сохранить» сама серая, пока данные
// невалидны. Наружу уходит ГОТОВЫЙ результат TaskFormResult
// (аналог TaskDialogData из C#) - цикл gherkin соблюдён:
// пустой заголовок -> окно не закроется.
// ============================================================================

import { useState } from 'react';
import { ModalShell } from '@/shared/ui';
import {
    FILTER_NONE, Priority, TaskState, WorkItemType,
    STATE_TITLES, PRIORITY_TITLES, TYPE_TITLES,
} from '@/entities/task';

export interface TaskOption {
    id: string;
    label: string;
}

/** Значения формы: спецзначения фильтров (FILTER_NONE) ещё не превращены в null. */
export interface TaskFormResult {
    title: string;
    description: string;
    assigneeId: string | null;   // уже null вместо FILTER_NONE
    epicId: string | null;       // уже null вместо FILTER_NONE
    state: TaskState;
    type: WorkItemType;
    priority: Priority;
    deadline: string | null;
}

interface TaskModalProps {
    existing: TaskFormResult | null;             // null => создание
    defaultState: TaskState;
    users: TaskOption[];
    epics: TaskOption[];
    onAnswer: (result: TaskFormResult | null) => void;
}

const stateOptions = Object.values(TaskState).map(v => ({ value: v, label: STATE_TITLES[v] }));
const typeOptions = Object.values(WorkItemType).map(v => ({ value: v, label: TYPE_TITLES[v] }));
const priorityOptions = Object.values(Priority).map(v => ({ value: v, label: PRIORITY_TITLES[v] }));

export function TaskModal({ existing, defaultState, users, epics, onAnswer }: TaskModalProps) {
    // ----- локальное состояние формы -----
    const [title, setTitle] = useState(existing?.title ?? '');
    const [description, setDescription] = useState(existing?.description ?? '');
    const [assigneeId, setAssigneeId] = useState(existing?.assigneeId ?? FILTER_NONE);
    const [epicId, setEpicId] = useState(existing?.epicId ?? FILTER_NONE);
    const [state, setState] = useState<TaskState>(existing?.state ?? defaultState);
    const [type, setType] = useState<WorkItemType>(existing?.type ?? WorkItemType.Task);
    const [priority, setPriority] = useState<Priority>(existing?.priority ?? Priority.Medium);
    const [deadline, setDeadline] = useState(existing?.deadline ?? '');

    // ----- валидация как вычисляемое значение -----
    const error = title.trim() ? '' : 'Заголовок обязателен';
    const canSave = error === '';

    const save = () => {
        if (!canSave) return;
        onAnswer({
            // спецзначения фильтров превращаем в настоящий null домена
            title: title.trim(),
            description: description.trim(),
            assigneeId: assigneeId === FILTER_NONE ? null : assigneeId,
            epicId: epicId === FILTER_NONE ? null : epicId,
            state,
            type,
            priority,
            deadline: deadline || null,
        });
    };

    return (
        <ModalShell onCancel={() => onAnswer(null)}>
            <h3>{existing ? 'Редактирование задачи' : 'Новая задача'}</h3>

            <label className="field-label">Заголовок *</label>
            <input className="input" autoFocus value={title} onChange={e => setTitle(e.target.value)} />

            <label className="field-label">Описание</label>
            <textarea rows={4} className="input" value={description}
                      onChange={e => setDescription(e.target.value)} />

            <div className="form-grid">
                <div>
                    <label className="field-label">Статус</label>
                    {/* Порядок select-ов важен для UI-тестов: статус -> тип -> приоритет */}
                    <select className="input" value={state} onChange={e => setState(e.target.value as TaskState)}>
                        {stateOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="field-label">Тип</label>
                    <select className="input" value={type} onChange={e => setType(e.target.value as WorkItemType)}>
                        {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="field-label">Приоритет</label>
                    <select className="input" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                        {priorityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="field-label">Дедлайн</label>
                    <input type="date" className="input" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
            </div>

            <label className="field-label">Исполнитель</label>
            <select className="input" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value={FILTER_NONE}>(без исполнителя)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>

            <label className="field-label">Эпик</label>
            <select className="input" value={epicId} onChange={e => setEpicId(e.target.value)}>
                <option value={FILTER_NONE}>(без эпика)</option>
                {epics.map(e2 => <option key={e2.id} value={e2.id}>{e2.label}</option>)}
            </select>

            {/* Ошибка и состояние кнопки - биндинг на вычисленное значение */}
            {error && <p className="hint danger">{error}</p>}

            <div className="modal-actions">
                <button className="btn primary" disabled={!canSave} onClick={save}>Сохранить</button>
                <button className="btn" onClick={() => onAnswer(null)}>Отмена</button>
            </div>
        </ModalShell>
    );
}
