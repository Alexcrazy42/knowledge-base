import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Sidebar.module.css';


export type SidebarPosition = 'left' | 'right';

export interface SidebarProps {
  children: ReactNode;
  
  opened: boolean;
  onClose: () => void;
  
  position?: SidebarPosition;
  width?: number | string;
  
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  lockBodyScroll?: boolean;
  
  showOverlay?: boolean;
  overlayOpacity?: number;
  showCloseButton?: boolean;
  title?: ReactNode;
  
  className?: string;
  style?: React.CSSProperties;
}

export function Sidebar({
  children,
  opened,
  onClose,
  position = 'right',
  width = 320,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  lockBodyScroll = true,
  showOverlay = true,
  overlayOpacity = 0.5,
  showCloseButton = true,
  title,
  className,
  style,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (opened) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [opened]);

  useEffect(() => {
    if (!lockBodyScroll) return;

    if (opened) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [opened, lockBodyScroll]);

  useEffect(() => {
    if (!opened || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [opened, closeOnEscape, onClose]);

  useEffect(() => {
    if (opened && sidebarRef.current) {
      sidebarRef.current.focus();
    } else if (!opened && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [opened]);

  useEffect(() => {
    if (!opened) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !sidebarRef.current) return;

      const focusableElements = sidebarRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [opened]);

  if (!opened) return null;

  const sidebarContent = (
    <>
      {showOverlay && (
        <div
          className={styles.overlay}
          style={{ opacity: overlayOpacity }}
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />
      )}
      <div
        ref={sidebarRef}
        className={`${styles.sidebar} ${styles[position]} ${className || ''}`}
        style={{
          width,
          ...style,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Боковая панель'}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && <div className={styles.title}>{title}</div>}
            {showCloseButton && (
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Закрыть"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className={styles.content}>{children}</div>
      </div>
    </>
  );

  return createPortal(sidebarContent, document.body);
}