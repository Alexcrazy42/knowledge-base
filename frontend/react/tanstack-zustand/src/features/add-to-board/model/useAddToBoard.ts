import { useBoardStore } from "../../../components/board/useBoardStore";
import type { Product } from "../../../entities/product/types";


export const useAddToBoard = () => {
  const addProduct = useBoardStore((state) => state.addProductToColumn);

  return (product: Product) => {
    addProduct('todo', product);
  };
};