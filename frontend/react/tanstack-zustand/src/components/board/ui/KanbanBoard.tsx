import { Column } from './Column';
import { useBoardStore, type ColumnId } from '../useBoardStore';

const COLUMNS: { id: ColumnId; title: string; color: string }[] = [
  { id: 'todo', title: 'К выполнению', color: 'bg-slate-100 border border-slate-200' },
  { id: 'in-progress', title: 'В работе', color: 'bg-blue-50 border border-blue-200' },
  { id: 'review', title: 'На проверке', color: 'bg-yellow-50 border border-yellow-200' },
  { id: 'done', title: 'Готово', color: 'bg-green-50 border border-green-200' },
];

export const KanbanBoard = () => {
  const { columns, moveProduct } = useBoardStore();

  const handleDragStart = (e: React.DragEvent, productId: number, columnId: ColumnId) => {
    e.dataTransfer.setData('productId', String(productId));
    e.dataTransfer.setData('sourceColumn', columnId);
    e.dataTransfer.effectAllowed = 'move';
    // Делаем карточку полупрозрачной при перетаскиванииё
    setTimeout(() => (e.currentTarget as HTMLElement).style.opacity = '0.5', 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumn: ColumnId) => {
    e.preventDefault();
    const productId = Number(e.dataTransfer.getData('productId'));
    const sourceColumn = e.dataTransfer.getData('sourceColumn') as ColumnId;

    if (sourceColumn && productId && sourceColumn !== targetColumn) {
      moveProduct(sourceColumn, targetColumn, productId);
    }
  };

  return (
    <div className="flex gap-6 p-6 h-full overflow-x-auto">
      {COLUMNS.map((col) => (
        <Column
          key={col.id}
          id={col.id}
          title={col.title}
          color={col.color}
          products={columns[col.id]}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
};