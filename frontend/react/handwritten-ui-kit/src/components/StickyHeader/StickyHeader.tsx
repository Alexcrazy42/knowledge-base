import { type ReactNode } from 'react';
import styles from './StickyHeader.module.css';

export interface StickyHeaderProps {
  children: ReactNode;
  sticky?: boolean;
  offset?: number;
  shadowOnSticky?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function StickyHeader({
  children,
  sticky = true,
  offset = 0,
  shadowOnSticky = true,
  className,
  style,
}: StickyHeaderProps) {
  return (
    <header
      className={`${styles.header} ${sticky ? styles.sticky : ''} ${
        shadowOnSticky ? styles.shadowOnSticky : ''
      } ${className || ''}`}
      style={{
        top: offset,
        ...style,
      }}
    >
      {children}
    </header>
  );
}