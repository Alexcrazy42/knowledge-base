import { Link } from 'react-router-dom';
import { LayoutDashboard, ArrowLeft } from 'lucide-react';
import { ROUTES } from '../../shared/config/routes';
import { KanbanBoard } from '../../components/board/ui/KanbanBoard';

export const BoardPage = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Kanban Доска</h1>
        </div>
        <Link to={ROUTES.CATALOG} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          К каталогу
        </Link>
      </header>
      <main className="flex-1 overflow-hidden">
        <KanbanBoard />
      </main>
    </div>
  );
};