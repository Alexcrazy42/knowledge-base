// ============================================================================
// UsersModal - экран пользователей в виде модалки (двухшаговый):
//   шаг 1 - список + добавление/удаление;
//   шаг 2 - при удалении с незавершёнными задачами: выбор, кому передать.
//
// Фича сама читает стор через useKanbanState - реактивность React обновит
// канбан позади окна (тот же принцип, что у reactive() в Vue-версии).
// Статистика по задачам всех досок - АГРЕГАЦИЯ user+task, поэтому живёт
// в фиче, а не в entities/user.
// Порт UsersModal.vue 1:1 (включая подписи для UI-тестов).
// ============================================================================

import { useMemo, useState } from 'react';
import { ModalShell } from '@/shared/ui';
import { kanbanStore, useKanbanState } from '@/entities/board';
import { TaskState } from '@/entities/task';
import type { User } from '@/entities/user';

interface UsersModalProps {
    onClose: () => void;
}

interface UserRowVM {
    user: User;
    open: number;
    summary: string;
}

export function UsersModal({ onClose }: UsersModalProps) {
    const state = useKanbanState();

    // ----- локальное состояние диалога -----
    const [newName, setNewName] = useState('');
    const [flash, setFlash] = useState('');
    const [step, setStep] = useState<'list' | 'reassign'>('list');
    const [pendingDelete, setPendingDelete] = useState<{ row: UserRowVM; others: User[] } | null>(null);
    const [reassignChoice, setReassignChoice] = useState('');

    // Статистика по задачам всех досок (как в UsersViewModel.Refresh C#-версии)
    const rows = useMemo<UserRowVM[]>(() => {
        const openByUser = new Map<string, number>();
        const totalByUser = new Map<string, number>();
        for (const b of state.boards) {
            for (const t of b.tasks) {
                if (!t.assigneeId) continue;
                totalByUser.set(t.assigneeId, (totalByUser.get(t.assigneeId) ?? 0) + 1);
                if (t.state !== TaskState.Done) {
                    openByUser.set(t.assigneeId, (openByUser.get(t.assigneeId) ?? 0) + 1);
                }
            }
        }
        return state.users.map(u => ({
            user: u,
            open: openByUser.get(u.id) ?? 0,
            summary: `${totalByUser.get(u.id) ?? 0} задач всего`,
        }));
    }, [state]);

    const addUser = () => {
        const name = newName.trim();
        if (!name) { setFlash('Имя обязательно'); return; }
        if (state.users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
            setFlash(`Пользователь «${name}» уже есть`);
            return;
        }
        kanbanStore.addUser(name);
        setNewName('');                       // очистка поля
        setFlash(`«${name}» добавлен(а)`);
    };

    const requestDelete = (row: UserRowVM) => {
        const others = state.users.filter(u => u.id !== row.user.id);
        if (row.open > 0 && others.length > 0) {
            setPendingDelete({ row, others });
            setReassignChoice(others[0].id);
            setStep('reassign');              // второй шаг: кому передать задачи
            return;
        }
        doDelete(row, null);
    };

    const confirmReassign = () => {
        if (!pendingDelete) return;
        doDelete(pendingDelete.row, reassignChoice);
    };

    const doDelete = (row: UserRowVM, reassignTo: string | null) => {
        if (row.open > 0 && !reassignTo) {
            setFlash(`У «${row.user.name}» ${row.open} активных задач, но некому их передать.`);
            setStep('list');
            setPendingDelete(null);
            return;
        }
        kanbanStore.deleteUser(row.user.id, reassignTo);
        setStep('list');
        setPendingDelete(null);
        setFlash(reassignTo ? `«${row.user.name}» удалён(а), задачи перенесены`
                            : `«${row.user.name}» удалён(а)`);
    };

    return (
        <ModalShell onCancel={onClose}>
            {/* ШАГ 1: список пользователей */}
            {step === 'list' && (
                <>
                    <h3>Пользователи</h3>
                    <ul className="user-list">
                        {rows.map(row => (
                            <li key={row.user.id} className={row.open > 0 ? 'hasOpen' : ''}>
                                <span className="user-name">{row.user.name}</span>
                                <span className="user-summary">{row.summary}</span>
                                <button className="icon-btn danger" title="Удалить" onClick={() => requestDelete(row)}>🗑</button>
                            </li>
                        ))}
                    </ul>
                    {rows.length === 0 && <p className="empty small">Пока никого нет.</p>}

                    <div className="inline-form">
                        <input
                            className="input grow"
                            placeholder="Имя нового пользователя"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addUser(); }}
                        />
                        <button className="btn primary" onClick={addUser}>Добавить</button>
                    </div>
                    <p className="hint danger">{flash}</p>
                </>
            )}

            {/* ШАГ 2: перенос незавершённых задач */}
            {step === 'reassign' && pendingDelete && (
                <>
                    <h3>Перенос задач</h3>
                    <p>У «{pendingDelete.row.user.name}» {pendingDelete.row.open} незавершённых задач(и).</p>
                    <label className="field-label">Кому передать?</label>
                    <select className="input" value={reassignChoice} onChange={e => setReassignChoice(e.target.value)}>
                        {pendingDelete.others.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <div className="modal-actions">
                        {/* Подпись важна для UI-тестов всех версий playground'а. */}
                        <button className="btn primary" onClick={confirmReassign}>Перенести и удалить</button>
                        <button className="btn" onClick={() => setStep('list')}>Назад</button>
                    </div>
                </>
            )}

            <div className="modal-actions">
                <button className="btn wide" onClick={onClose}>Закрыть</button>
            </div>
        </ModalShell>
    );
}
