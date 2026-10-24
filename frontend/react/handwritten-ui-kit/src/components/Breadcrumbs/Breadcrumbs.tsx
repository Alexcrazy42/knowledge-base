import { Fragment, type ReactNode } from 'react';
import styles from './Breadcrumbs.module.css';

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  maxItems?: number;
  className?: string;
  'aria-label'?: string;
}

export function Breadcrumbs({
  items,
  separator = '/',
  maxItems,
  className,
  'aria-label': ariaLabel = 'Навигационная цепочка',
}: BreadcrumbsProps) {
  let displayItems: (BreadcrumbItem | { isCollapsed: true })[] = items;
  
  if (maxItems && items.length > maxItems) {
    const firstItem = items[0];
    const lastItems = items.slice(-(maxItems - 1));
    displayItems = [firstItem, { label: '...', isCollapsed: true }, ...lastItems];
  }

  return (
    <nav className={`${styles.container} ${className || ''}`} aria-label={ariaLabel}>
      <ol className={styles.list}>
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isCollapsed = 'isCollapsed' in item && item.isCollapsed;

          return (
            <Fragment key={index}>
              <li className={styles.item}>
                {isCollapsed ? (
                  <span className={styles.collapsed} title="Скрытые элементы">
                    {item.label}
                  </span>
                ) : isLast ? (
                  <span className={styles.current} aria-current="page">
                    {item.icon && <span className={styles.icon}>{item.icon}</span>}
                    {item.label}
                  </span>
                ) : item.href ? (
                  <a href={item.href} className={styles.link}>
                    {item.icon && <span className={styles.icon}>{item.icon}</span>}
                    {item.label}
                  </a>
                ) : item.onClick ? (
                  <button type="button" className={styles.link} onClick={item.onClick}>
                    {item.icon && <span className={styles.icon}>{item.icon}</span>}
                    {item.label}
                  </button>
                ) : (
                  <span className={styles.link}>
                    {item.icon && <span className={styles.icon}>{item.icon}</span>}
                    {item.label}
                  </span>
                )}
              </li>
              
              {!isLast && (
                <li className={styles.separatorItem} aria-hidden="true">
                  {separator}
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}