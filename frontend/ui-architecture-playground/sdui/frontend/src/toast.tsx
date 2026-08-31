import { useSyncExternalStore } from 'react';

export interface ToastItem {
  id: number;
  text: string;
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function subscribeToasts(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function snapshot(): ToastItem[] {
  return toasts;
}

export function pushToast(text: string): void {
  const id = nextId++;
  toasts = [...toasts, { id, text }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3500);
}

export function ToastHost() {
  const items = useSyncExternalStore(subscribeToasts, snapshot);
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className="toast" role="status">
          {t.text}
        </div>
      ))}
    </div>
  );
}