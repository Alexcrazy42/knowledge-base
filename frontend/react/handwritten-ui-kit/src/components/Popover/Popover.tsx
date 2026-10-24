import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Popover.module.css';

export type PopoverPlacement = 
  | 'top' | 'top-start' | 'top-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'
  | 'right' | 'right-start' | 'right-end';

export type PopoverTrigger = 'click' | 'hover' | 'focus';

export interface PopoverProps {
  children: ReactNode;
  content: ReactNode;
  title?: ReactNode;
  
  opened?: boolean;
  defaultOpened?: boolean;
  onOpenChange?: (opened: boolean) => void;
  

  placement?: PopoverPlacement;
  offset?: number;
  showArrow?: boolean;
  
  trigger?: PopoverTrigger;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  destroyOnClose?: boolean;
  
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  
  withActions?: boolean;
  onOk?: () => Promise<void> | void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  loading?: boolean;
}


export function Popover({
  children,
  content,
  title,
  opened,
  defaultOpened = false,
  onOpenChange,
  placement = 'bottom',
  offset = 8,
  showArrow = true,
  trigger = 'click',
  closeOnOutsideClick = true,
  closeOnEscape = true,
  destroyOnClose = false,
  width,
  className,
  style,
  disabled = false,
  withActions = false,
  onOk,
  onCancel,
  okText = 'OK',
  cancelText = 'Отмена',
  loading = false,
}: PopoverProps) {
  const [internalOpened, setInternalOpened] = useState(defaultOpened);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const isControlled = opened !== undefined;
  const isOpen = isControlled ? opened : internalOpened;
  
  const setIsOpen = useCallback((value: boolean) => {
    if (!isControlled) {
      setInternalOpened(value);
    }
    onOpenChange?.(value);
  }, [isControlled, onOpenChange]);
  
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top = 0;
    let left = 0;
    let newPlacement = placement;
    
    switch (placement) {
      case 'top':
      case 'top-start':
      case 'top-end':
        top = triggerRect.top - popoverRect.height - offset;
        if (placement === 'top') left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
        else if (placement === 'top-start') left = triggerRect.left;
        else left = triggerRect.right - popoverRect.width;
        
        // Если не помещается сверху, переворачиваем вниз
        if (top < 0) {
          newPlacement = placement.replace('top', 'bottom') as PopoverPlacement;
          top = triggerRect.bottom + offset;
        }
        break;
        
      case 'bottom':
      case 'bottom-start':
      case 'bottom-end':
        top = triggerRect.bottom + offset;
        if (placement === 'bottom') left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
        else if (placement === 'bottom-start') left = triggerRect.left;
        else left = triggerRect.right - popoverRect.width;
        
        // Если не помещается снизу, переворачиваем вверх
        if (top + popoverRect.height > viewportHeight) {
          newPlacement = placement.replace('bottom', 'top') as PopoverPlacement;
          top = triggerRect.top - popoverRect.height - offset;
        }
        break;
        
      case 'left':
      case 'left-start':
      case 'left-end':
        left = triggerRect.left - popoverRect.width - offset;
        if (placement === 'left') top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
        else if (placement === 'left-start') top = triggerRect.top;
        else top = triggerRect.bottom - popoverRect.height;
        
        // Если не помещается слева, переворачиваем вправо
        if (left < 0) {
          newPlacement = placement.replace('left', 'right') as PopoverPlacement;
          left = triggerRect.right + offset;
        }
        break;
        
      case 'right':
      case 'right-start':
      case 'right-end':
        left = triggerRect.right + offset;
        if (placement === 'right') top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
        else if (placement === 'right-start') top = triggerRect.top;
        else top = triggerRect.bottom - popoverRect.height;
        
        // Если не помещается справа, переворачиваем влево
        if (left + popoverRect.width > viewportWidth) {
          newPlacement = placement.replace('right', 'left') as PopoverPlacement;
          left = triggerRect.left - popoverRect.width - offset;
        }
        break;
    }
    
    // Ограничиваем позицию в пределах viewport
    left = Math.max(8, Math.min(left, viewportWidth - popoverRect.width - 8));
    top = Math.max(8, Math.min(top, viewportHeight - popoverRect.height - 8));
    
    setPosition({ top, left });
    setActualPlacement(newPlacement);
  }, [placement, offset]);
  
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(updatePosition);
    }
  }, [isOpen, updatePosition]);
  
  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeOnOutsideClick, setIsOpen]);
  
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, setIsOpen]);
  
  const triggerProps = {
    onClick: trigger === 'click' ? () => !disabled && setIsOpen(!isOpen) : undefined,
    onMouseEnter: trigger === 'hover' ? () => {
      if (disabled) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsOpen(true);
    } : undefined,
    onMouseLeave: trigger === 'hover' ? () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
    } : undefined,
    onFocus: trigger === 'focus' ? () => !disabled && setIsOpen(true) : undefined,
    onBlur: trigger === 'focus' ? () => setIsOpen(false) : undefined,
  };
  
  const handleOk = async () => {
    if (onOk) {
      await onOk();
    }
    setIsOpen(false);
  };
  
  const handleCancel = () => {
    onCancel?.();
    setIsOpen(false);
  };
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const popoverContent = (
    <div
      ref={popoverRef}
      className={`${styles.popover} ${styles[actualPlacement]} ${className || ''}`}
      style={{
        top: position.top,
        left: position.left,
        width,
        ...style,
      }}
      role="dialog"
      aria-modal="false"
      onMouseEnter={trigger === 'hover' ? () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } : undefined}
      onMouseLeave={trigger === 'hover' ? () => {
        timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
      } : undefined}
    >
      {showArrow && <div className={styles.arrow} />}
      
      {title && <div className={styles.title}>{title}</div>}
      
      <div className={styles.content}>{content}</div>
      
      {withActions && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={styles.okButton}
            onClick={handleOk}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : okText}
          </button>
        </div>
      )}
    </div>
  );
  
  return (
    <>
      <div
        ref={triggerRef}
        className={styles.trigger}
        {...triggerProps}
      >
        {children}
      </div>
      
      {isOpen && createPortal(
        destroyOnClose ? null : popoverContent,
        document.body
      )}
      
      {isOpen && destroyOnClose && createPortal(
        popoverContent,
        document.body
      )}
    </>
  );
}