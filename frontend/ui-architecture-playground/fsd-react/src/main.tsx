// ============================================================================
// main.tsx - точка входа. Создаём корень React и монтируем в #root.
// Композиция минимальна: стор - singleton в entities/board, страница - в pages.
// ============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
