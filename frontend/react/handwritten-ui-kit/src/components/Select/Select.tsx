import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Выберите...',
      label,
      error,
      disabled = false,
      size = 'medium',
      className,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    useEffect(() => {
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    useEffect(() => {
      if (isOpen && activeIndex >= 0) {
        const activeElement = dropdownRef.current?.querySelector(
          `[data-index="${activeIndex}"]`
        );
        activeElement?.scrollIntoView({ block: 'nearest' });
      }
    }, [activeIndex, isOpen]);

    const handleToggle = useCallback(() => {
      if (disabled) return;
      setIsOpen((prev) => !prev);
      setActiveIndex(-1);
    }, [disabled]);

    const handleSelect = useCallback(
      (optionValue: string) => {
        onChange?.(optionValue);
        setIsOpen(false);
        setActiveIndex(-1);
        triggerRef.current?.focus();
      },
      [onChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            if (isOpen && activeIndex >= 0) {
              const option = options[activeIndex];
              if (option && !option.disabled) {
                handleSelect(option.value);
              }
            } else {
              handleToggle();
            }
            break;

          case 'ArrowDown':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              setActiveIndex(0);
            } else {
              setActiveIndex((prev) => {
                let next = prev + 1;
                while (next < options.length && options[next].disabled) {
                  next++;
                }
                return next < options.length ? next : prev;
              });
            }
            break;

          case 'ArrowUp':
            e.preventDefault();
            if (isOpen) {
              setActiveIndex((prev) => {
                let next = prev - 1;
                while (next >= 0 && options[next].disabled) {
                  next--;
                }
                return next >= 0 ? next : prev;
              });
            }
            break;

          case 'Escape':
            e.preventDefault();
            setIsOpen(false);
            setActiveIndex(-1);
            triggerRef.current?.focus();
            break;

          case 'Tab':
            setIsOpen(false);
            setActiveIndex(-1);
            break;
        }
      },
      [disabled, isOpen, activeIndex, options, handleSelect, handleToggle]
    );

    const wrapperClasses = [
      styles.wrapper,
      styles[`size-${size}`],
      error && styles['has-error'],
      disabled && styles['is-disabled'],
      isOpen && styles['is-open'],
      className,
    ]
    .filter(Boolean)
    .join(' ');

    return (
      <div className={wrapperClasses} ref={ref}>
        {label && <label className={styles.label}>{label}</label>}

        <div className={styles.container} onKeyDown={handleKeyDown}>
          <button
            ref={triggerRef}
            type="button"
            className={styles.trigger}
            onClick={handleToggle}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span
              className={`${styles.triggerText} ${
                !selectedOption ? styles.placeholder : ''
              }`}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <span className={styles.arrow}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>

          {isOpen && (
            <div
              ref={dropdownRef}
              className={styles.dropdown}
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;

                const optionClasses = [
                  styles.option,
                  isSelected && styles['option-selected'],
                  isActive && styles['option-active'],
                  option.disabled && styles['option-disabled'],
                ]
                .filter(Boolean)
                .join(' ');

                return (
                  <div
                    key={option.value}
                    className={optionClasses}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    data-index={index}
                    onClick={() => {
                      if (!option.disabled) {
                        handleSelect(option.value);
                      }
                    }}
                    onMouseEnter={() => {
                      console.log(`mouse enter, active enter: ${index}`)
                      if (!option.disabled) {
                        setActiveIndex(index);
                      }
                    }}
                  >
                    {option.label}
                    {isSelected && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </div>
                );
              })}

              {options.length === 0 && (
                <div className={styles.empty}>Нет вариантов</div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className={styles.error}>
            <span className={styles.errorText}>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;