import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { CatalogPage } from '../pages/catalog/CatalogPage';
import { BoardPage } from '../pages/board/BoardPage';
import { ROUTES } from '../shared/config/routes';

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route path={ROUTES.CATALOG} element={<CatalogPage />} />
          <Route path={ROUTES.BOARD} element={<BoardPage />} />
          <Route path="*" element={<Navigate to={ROUTES.CATALOG} replace />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}