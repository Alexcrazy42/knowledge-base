import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  const getValue = useCallback(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // SSR-safe
    }
  }, [key]);

  useEffect(() => {
    setStoredValue(getValue());
  }, [getValue]);

  return [storedValue, setValue];
}

export { useLocalStorage };
