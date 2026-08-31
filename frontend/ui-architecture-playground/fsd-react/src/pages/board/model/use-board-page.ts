// ============================================================================
// Страничная модель канбана - "композиционный слой" FSD.
//
// Чего здесь НЕТ в строгом смысле MVVM: это не ViewModel со свойствами,
// а сборка фич и сущностей для конкретного экрана. Страница владеет только
// UI-состоянием (текущая доска, критерии фильтра, выделенный эпик, флеш),
// сценарии живут в features, данные - в entities.
//
// Сравните с useKanbanViewModel.js из mvmm-vue и MainViewModel.cs из WPF:
// те же поля и команды, но разложенные по слоям FSD.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { kanbanStore, useKanbanState } from '@/entities/board';
import { FILTER_NONE } from '@/entities/task';
import type { TaskFilterCriteria } from '@/entities/task';
import { epicLabel } from '@/entities/epic';
import { defaultFilterCriteria, useTaskColumns } from '@/features/filter-tasks';
import type { FilterOption } from '@/features/filter-tasks';
import { buildEpicRows, useEpicCommands } from '@/features/manage-epics';
import { useBoardCommands } from '@/features/manage-boards';
import { useTaskCommands } from '@/features/manage-tasks';
import { useDataCommands } from '@/features/data-transfer';

export function useBoardPage() {
    // ---- состояние из стора (перерисовка при каждой мутации) ----
    const state = useKanbanState();

    // ---- локальное UI-состояние страницы ----
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(
        () => kanbanStore.firstBoard()?.id ?? null,
    );
    const [flashText, setFlashText] = useState('Создайте первую доску');
    const [criteria, setCriteria] = useState<TaskFilterCriteria>(defaultFilterCriteria);
    const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
    const [usersOpen, setUsersOpen] = useState(false);

    const setFlash = useCallback((message: string) => {
        setFlashText(`[${new Date().toLocaleTimeString()}] ${message}`);
    }, []);

    // Текущая доска пересчитывается от снапшота стора.
    const currentBoard = useMemo(
        () => state.boards.find(b => b.id === currentBoardId) ?? null,
        [state.boards, currentBoardId],
    );

    // ---- команды фич (каждая получает только то, что ей нужно) ----
    const boardCommands = useBoardCommands({ flash: setFlash, onSwitchTo: setCurrentBoardId });
    const epicCommands = useEpicCommands({ flash: setFlash });
    const taskCommands = useTaskCommands({ flash: setFlash });
    const dataCommands = useDataCommands({
        flash: setFlash,
        onStateReplaced: () => {
            setCurrentBoardId(kanbanStore.firstBoard()?.id ?? null);
            setSelectedEpicId(null);
        },
    });

    // ---- вычисляемое (то, что в MVP вручную собирал Reload()) ----
    const columns = useTaskColumns({ board: currentBoard, users: state.users, criteria });
    const epicRows = useMemo(
        () => buildEpicRows(currentBoard?.epics ?? [], currentBoard?.tasks ?? []),
        [currentBoard],
    );

    /** Опции комбобокса исполнителей: «(все)» / «Без исполнителя» / пользователи. */
    const assigneeOptions = useMemo<FilterOption[]>(() => [
        { id: null, label: '(все исполнители)' },
        { id: FILTER_NONE, label: 'Без исполнителя' },
        ...state.users.map(u => ({ id: u.id, label: u.name })),
    ], [state.users]);

    const epicOptions = useMemo<FilterOption[]>(() => [
        { id: null, label: '(все эпики)' },
        { id: FILTER_NONE, label: 'Без эпика' },
        ...(currentBoard?.epics ?? []).map(e => ({ id: e.id, label: epicLabel(e) })),
    ], [currentBoard]);

    // Выделение протухло (эпик удалён/доска сменилась)? -> сбрасываем.
    useEffect(() => {
        if (selectedEpicId !== null && !epicRows.some(r => r.epic.id === selectedEpicId)) {
            setSelectedEpicId(null);
        }
    }, [epicRows, selectedEpicId]);

    return {
        // данные
        boards: state.boards,
        currentBoardId,
        currentBoard,
        columns,
        epicRows,
        criteria,
        assigneeOptions,
        epicOptions,
        flashText,
        usersOpen,
        selectedEpicId,
        // команды
        setCurrentBoardId,
        setCriteria,
        setSelectedEpicId,
        setUsersOpen,
        boardCommands,
        epicCommands,
        taskCommands,
        dataCommands,
    };
}
