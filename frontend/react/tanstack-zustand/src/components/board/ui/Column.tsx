import { ProductCard } from "../../../entities/product/ProductCard";
import type { Product } from "../../../entities/product/types";
import { cn } from "../../../shared/lib/cn";
import type { ColumnId } from "../useBoardStore";


interface ColumnProps {
  id: ColumnId;
  title: string;
  color: string;
  products: Product[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetColumn: ColumnId) => void;
  onDragStart: (e: React.DragEvent, productId: number, columnId: ColumnId) => void;
}

export const Column = ({ id, title, color, products, onDragOver, onDrop, onDragStart }: ColumnProps) => {
  return (
    <div 
      className={cn('flex-1 min-w-[300px] rounded-xl p-4 flex flex-col h-full', color)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, id)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <span className="bg-white/50 text-gray-700 px-2 py-1 rounded-full text-xs font-bold">
          {products.length}
        </span>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isDraggable={true}
            onDragStart={(e, productId) => onDragStart(e, productId, id)}
          />
        ))}
        {products.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-lg bg-white/30">
            Перетащите сюда
          </div>
        )}
      </div>
    </div>
  );
};