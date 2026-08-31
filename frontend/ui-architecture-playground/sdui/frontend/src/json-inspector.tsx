import { useMemo, useState } from 'react';
import type { ScreenDoc } from './contract';

// Обучающий аксессуар: любому экрану можно показать его сырую JSON-схему.
// Демонстрирует, что "экран" - это просто данные с бэкенда.
export function JsonInspector({ screen }: { screen: ScreenDoc }) {
  const [open, setOpen] = useState(false);
  const json = useMemo(() => JSON.stringify(screen, null, 2), [screen]);
  return (
    <details className="inspector" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Показать JSON-схему экрана (Server-Driven UI)</summary>
      <pre>{json}</pre>
    </details>
  );
}