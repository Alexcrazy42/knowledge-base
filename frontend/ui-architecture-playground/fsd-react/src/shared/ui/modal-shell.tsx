// ============================================================================
// ModalShell - общая оболочка оверлея (.overlay > .modal), как в Vue-версии.
// Клик по фону = отмена. Аналог ShowDialog() из C#.
// Это "ui-кирпичик" слоя shared: знает про CSS, не знает про домен.
// ============================================================================

import type { ReactNode } from 'react';

interface ModalShellProps {
    children: ReactNode;
    onCancel: () => void;
}

export function ModalShell({ children, onCancel }: ModalShellProps) {
    return (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="modal">{children}</div>
        </div>
    );
}
