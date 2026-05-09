import { useEffect, useRef, useCallback } from 'react';

function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
): React.RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null!);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback();
      }
    });
  }, [callback]);

  useEffect(() => {
    // 1. Создаём observer
    observerRef.current = new IntersectionObserver(handleObserver, options);

    // 2. Сразу подписываемся (если ref готов)
    if (ref.current) {
      observerRef.current.observe(ref.current);
    }

    // 3. Cleanup
    return () => {
      observerRef.current?.disconnect();
    };
  }, [handleObserver, options]);  // deps: пересоздаёт observer при изменении

  return ref;
}

export { useIntersectionObserver };
