// ============================================================================
// React-хук над стором: мост между иммутабельным снапшотом и компонентами.
// useSyncExternalStore - официальный способ подписаться на внешний стор
// (Redux/Zustand под капотом делают то же самое).
//
// В MVVM-проектах эту роль играл ViewModel со свойствами и PropertyChanged;
// здесь компоненты сами вычисляют нужное через useMemo от одного снапшота.
// ============================================================================

import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import { kanbanStore } from './store';

export function useKanbanState() {
    return useSyncExternalStore(kanbanStore.subscribe, kanbanStore.getState);
}

/** Текущая доска по id (или первая, если id не задан/протух). */
export function useBoardById(boardId: string | null) {
    const state = useKanbanState();
    return useMemo(
        () => state.boards.find(b => b.id === boardId) ?? null,
        [state.boards, boardId],
    );
}
