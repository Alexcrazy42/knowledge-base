import { useEffect, useState, useRef } from 'react';


// но лучше использовать lodash
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeoutRef.current!);
  }, [value, delay]);

  return debouncedValue;
}

export { useDebounce };