import type { Product } from '../../../entities/product/types';
import { Button } from '../../../shared/ui/Button';
import { useAddToBoard } from '../model/useAddToBoard';
import { Plus } from 'lucide-react';

export const AddToBoardButton = ({ product }: { product: Product }) => {
  const addToBoard = useAddToBoard();

  return (
    <Button 
      className="w-full mt-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
      onClick={() => addToBoard(product)}
    >
      <Plus className="w-4 h-4 mr-2" />
      На доску
    </Button>
  );
};