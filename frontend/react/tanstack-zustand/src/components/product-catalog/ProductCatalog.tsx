import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { productApi } from '../../entities/product/productApi';
import { ProductCard } from '../../entities/product/ProductCard';
import { AddToBoardButton } from '../../features/add-to-board/ui/AddToBoardButton';

export const ProductCatalog = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', 'catalog'],
    queryFn: () => productApi.getAll(20, 0),
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
  if (isError) return <div className="text-red-500 p-8">Ошибка загрузки</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {data?.products.map((product) => (
        <div key={product.id} className="flex flex-col">
          <ProductCard product={product} variant="compact" />
          <AddToBoardButton product={product} />
        </div>
      ))}
    </div>
  );
};