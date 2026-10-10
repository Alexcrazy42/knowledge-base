import { Star } from 'lucide-react';
import type { Product } from './types';
import { cn } from '../../shared/lib/cn';

interface ProductCardProps {
  product: Product;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent, productId: number) => void;
  variant?: 'default' | 'compact';
}

export const ProductCard = ({ 
  product, 
  isDraggable = false, 
  onDragStart,
  variant = 'default' 
}: ProductCardProps) => {
  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => onDragStart?.(e, product.id)}
      className={cn(
        'bg-white rounded-lg border border-gray-200 transition-shadow',
        isDraggable && 'cursor-grab active:cursor-grabbing hover:shadow-md',
        variant === 'compact' ? 'p-3' : 'p-4'
      )}
    >
      <div className={cn('flex gap-3', variant === 'compact' ? 'items-center' : 'flex-col')}>
        <img
          src={product.thumbnail}
          alt={product.title}
          className={cn(
            'object-cover rounded-md bg-gray-100',
            variant === 'compact' ? 'w-12 h-12' : 'w-full h-32'
          )}
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 truncate">{product.title}</h4>
          <p className="text-xs text-gray-500">{product.brand}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-bold text-gray-900">${product.price}</span>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {product.rating}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};