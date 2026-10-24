import { Link } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import { ROUTES } from '../../shared/config/routes';
import { ProductCatalog } from '../../components/product-catalog/ProductCatalog';

export const CatalogPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Каталог продуктов</h1>
        </div>
        <Link to={ROUTES.BOARD} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          Перейти к доске
          <ArrowRight className="w-4 h-4" />
        </Link>
      </header>
      <main className="flex-1">
        <ProductCatalog />
      </main>
    </div>
  );
};