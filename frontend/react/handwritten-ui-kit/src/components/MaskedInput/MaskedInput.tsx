import React, { forwardRef, useRef } from 'react';
import styles from './MaskedInput.module.css';

const defaultDefinitions: Record<string, { pattern: RegExp; transform?: (char: string) => string }> = {
  '0': { pattern: /\d/ }, // Любая цифра
  'a': { pattern: /[a-zA-Zа-яА-Я]/ }, // Любая буква
  '*': { pattern: /./ }, // Любой символ
  'A': { 
    pattern: /[a-zA-Zа-яА-Я]/,
    transform: (char) => char.toUpperCase()
  },
};

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: string;
  definitions?: Record<string, { pattern: RegExp; transform?: (char: string) => string }>;
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  showCounter?: boolean;
}

const formatValue = (
  rawValue: string,
  mask: string,
  definitions: Record<string, { pattern: RegExp; transform?: (char: string) => string }>
): string => {
  let result = '';
  let valueIndex = 0;

  for (let maskIndex = 0; maskIndex < mask.length && valueIndex < rawValue.length; maskIndex++) {
    const maskChar = mask[maskIndex];
    const definition = definitions[maskChar];

    if (definition) {
      // Это место для ввода (0, a, *, A)
      const inputChar = rawValue[valueIndex];
      
      if (definition.pattern.test(inputChar)) {
        const transformedChar = definition.transform 
          ? definition.transform(inputChar) 
          : inputChar;
        result += transformedChar;
        valueIndex++;
      } else {
        // Символ не подходит под маску, пропускаем его
        valueIndex++;
        maskIndex--; // Остаемся на том же символе маски
      }
    } else {
      // Это фиксированный символ маски (скобка, тире и т.д.)
      result += maskChar;
      
      // Если пользователь сам ввел этот фиксированный символ, пропускаем его во входной строке
      if (rawValue[valueIndex] === maskChar) {
        valueIndex++;
      }
    }
  }

  return result;
};

const calculateCursorPosition = (
  oldValue: string,
  newValue: string,
  oldCursorPos: number,
  mask: string,
  definitions: Record<string, { pattern: RegExp; transform?: (char: string) => string }>
): number => {
  // Считаем, сколько "мест для ввода" было заполнено до курсора в старом значении
  let oldSlotsFilled = 0;
  for (let i = 0; i < oldCursorPos && i < oldValue.length; i++) {
    const maskChar = mask[i];
    if (definitions[maskChar] && definitions[maskChar].pattern.test(oldValue[i])) {
      oldSlotsFilled++;
    }
  }

  // Считаем общее количество заполненных мест
  const oldTotalSlots = oldValue.split('').filter((char, i) => {
    const maskChar = mask[i];
    return definitions[maskChar] && definitions[maskChar].pattern.test(char);
  }).length;

  const newTotalSlots = newValue.split('').filter((char, i) => {
    const maskChar = mask[i];
    return definitions[maskChar] && definitions[maskChar].pattern.test(char);
  }).length;

  // Определяем целевое количество заполненных мест
  let targetSlots = oldSlotsFilled;

  if (newTotalSlots > oldTotalSlots) {
    targetSlots += 1; // Ввели новый символ
  } else if (newTotalSlots < oldTotalSlots) {
    targetSlots = Math.max(0, targetSlots); // Удалили символ
  }

  // Если ничего не заполнено, ставим курсор на первое доступное место в маске
  if (targetSlots === 0) {
    for (let i = 0; i < mask.length; i++) {
      if (definitions[mask[i]]) {
        return i;
      }
    }
    return 0;
  }

  // Ищем позицию в новой строке, где заполнено targetSlots мест
  let currentSlots = 0;
  for (let i = 0; i < newValue.length; i++) {
    const maskChar = mask[i];
    if (definitions[maskChar] && definitions[maskChar].pattern.test(newValue[i])) {
      currentSlots++;
      if (currentSlots === targetSlots) {
        return i + 1; // Позиция ПОСЛЕ этого символа
      }
    }
  }

  return newValue.length;
};

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ 
    mask, 
    definitions = defaultDefinitions,
    label, 
    error, 
    icon, 
    showCounter, 
    value, 
    onChange, 
    className, 
    ...rest 
  }, ref) => {
    const internalRef = useRef<HTMLInputElement>(null);

    const setRef = (element: HTMLInputElement | null) => {
      internalRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) ref.current = element;
    };

    // === ГЛАВНАЯ МАГИЯ ЗДЕСЬ ===
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const oldValue = input.value;
      const oldCursorPos = input.selectionStart || 0;

      // 1. Форматируем то, что ввел пользователь, согласно маске
      const newValue = formatValue(e.target.value, mask, definitions);

      // 2. Вычисляем, где должен оказаться курсор после форматирования
      const newCursorPos = calculateCursorPosition(
        oldValue,
        newValue,
        oldCursorPos,
        mask,
        definitions
      );

      // 3. Создаем новое событие с отформатированным значением
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: newValue,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      // 4. Отдаем управление родителю (React обновит стейт)
      onChange?.(syntheticEvent);

      // 5. Восстанавливаем курсор в следующем кадре анимации, 
      // чтобы React успел отрисовать новое значение в DOM
      requestAnimationFrame(() => {
        if (internalRef.current) {
          internalRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    };

    const fillPercent = value ? (String(value).length / mask.length) * 100 : 0;

    const wrapperClasses = [
      styles.wrapper,
      error && styles['has-error'],
      rest.disabled && styles['is-disabled'],
      className,
    ].filter(Boolean).join(' ');

    return (
      <div className={wrapperClasses}>
        {label && <label className={styles.label}>{label}</label>}
        
        <div className={styles.inputContainer}>
          {icon && <span className={styles.icon}>{icon}</span>}
          
          <input
            ref={setRef}
            className={styles.field}
            value={value}
            onChange={handleChange}
            maxLength={mask.length}
            placeholder={mask.replace(/[0a*A]/g, '_')} 
            data-mask-partial={value && String(value).length < mask.length ? 'true' : undefined}
            style={{ '--mask-fill-percent': `${fillPercent}%` } as React.CSSProperties}
            {...rest}
          />
        </div>

        {showCounter && (
          <div className={`${styles.counter} ${error ? styles['has-error'] : ''}`}>
            {value ? String(value).length : 0} / {mask.length}
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <span className={styles.errorText}>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

MaskedInput.displayName = 'MaskedInput';
export default MaskedInput;