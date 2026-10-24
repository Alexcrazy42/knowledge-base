import React, { useState, type ReactNode } from 'react';
import styles from './Tabs.module.css';

export interface TabProps {
  id: string;
  label: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}

export interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  activeKey?: string;
  onChange?: (id: string) => void;
}

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

export function Tabs({
  children,
  defaultValue,
  activeKey,
  onChange,
}: TabsProps) {
  const isControlled = activeKey !== undefined;
  
  const [internalActiveKey, setInternalActiveKey] = useState(defaultValue);
  
  const currentActiveKey = isControlled ? activeKey : internalActiveKey;

  const handleTabClick = (id: string, disabled?: boolean) => {
    if (disabled) return;
    
    if (!isControlled) {
      setInternalActiveKey(id);
    }
    
    onChange?.(id);
  };

  // 5. Рендерим заголовки вкладок, извлекая props из children
  const tabHeaders = React.Children.map(children, (child) => {
    // Проверяем, что child это валидный React-элемент и у него есть props.id
    if (child.props.id) {
      const { id, label, disabled } = child.props as TabProps;
      const isActive = id === currentActiveKey;

      return (
        <button
          key={id}
          type="button"
          className={`${styles.tabButton} ${isActive ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
          onClick={() => handleTabClick(id, disabled)}
          role="tab"
          aria-selected={isActive}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
        >
          {label}
        </button>
      );
    }
    return null;
  });

  const activeTabContent = React.Children.toArray(children).find(
    (child) => child.props.id === currentActiveKey
  );

  return (
    <div className={styles.tabsContainer} role="tablist">
      <div className={styles.header}>
        {tabHeaders}
      </div>
      
      <div className={styles.content} role="tabpanel">
        {activeTabContent ? (activeTabContent as React.ReactElement).props.children : null}
      </div>
    </div>
  );
}