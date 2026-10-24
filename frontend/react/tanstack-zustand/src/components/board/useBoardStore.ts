import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../../entities/product/types';

export type ColumnId = 'todo' | 'in-progress' | 'review' | 'done';

export interface BoardState {
  columns: Record<ColumnId, Product[]>;
  addProductToColumn: (columnId: ColumnId, product: Product) => void;
  moveProduct: (sourceColumn: ColumnId, targetColumn: ColumnId, productId: number) => void;
  removeProduct: (columnId: ColumnId, productId: number) => void;
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      columns: { todo: [], 'in-progress': [], review: [], done: [] },
      
      addProductToColumn: (columnId, product) =>
        set((state) => {
          if (state.columns[columnId].some((p) => p.id === product.id)) return state;
          return {
            columns: { ...state.columns, [columnId]: [...state.columns[columnId], product] },
          };
        }),

      moveProduct: (sourceColumn, targetColumn, productId) =>
        set((state) => {
          const sourceProducts = [...state.columns[sourceColumn]];
          const productIndex = sourceProducts.findIndex((p) => p.id === productId);
          if (productIndex === -1) return state;

          const [product] = sourceProducts.splice(productIndex, 1);
          
          // Если перемещаем в ту же колонку, просто возвращаем (для простоты без сортировки внутри)
          if (sourceColumn === targetColumn) return state;

          const targetProducts = [...state.columns[targetColumn], product];

          return {
            columns: {
              ...state.columns,
              [sourceColumn]: sourceProducts,
              [targetColumn]: targetProducts,
            },
          };
        }),

      removeProduct: (columnId, productId) =>
        set((state) => ({
          columns: {
            ...state.columns,
            [columnId]: state.columns[columnId].filter((p) => p.id !== productId),
          },
        })),
    }),
    { name: 'kanban-board-storage' }
  )
);