import { useSyncExternalStore } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  okLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Pending {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

let pending: Pending | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function subscribeDialog(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function snapshot(): Pending | null {
  return pending;
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    pending = { options, resolve };
    emit();
  });
}

function settle(value: boolean): void {
  const current = pending;
  pending = null;
  emit();
  current?.resolve(value);
}

export function confirmResult(value: boolean): void {
  settle(value);
}

export function DialogHost() {
  const current = useSyncExternalStore(subscribeDialog, snapshot);
  if (!current) return null;
  const { options } = current;
  return (
    <div className="overlay">
      <div className="modal" role="dialog" aria-modal="true">
        <h3>{options.title}</h3>
        <p>{options.message}</p>
        <div className="modal-actions">
          <button
            type="button"
            className={'btn ' + (options.danger ? 'danger' : 'ghost')}
            onClick={() => confirmResult(true)}
          >
            {options.okLabel}
          </button>
          <button type="button" className="btn ghost" onClick={() => confirmResult(false)}>
            {options.cancelLabel ?? 'Отмена'}
          </button>
        </div>
      </div>
    </div>
  );
}