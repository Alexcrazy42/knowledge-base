import { createPortal } from 'react-dom';
import { useToast } from './ToastContext';
import styles from './Toast.module.css';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return createPortal(
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          role="alert"
        >
          <div className={styles.icon}>{icons[toast.type]}</div>
          <div className={styles.message}>{toast.message}</div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => removeToast(toast.id)}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}