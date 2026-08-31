import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchScreen } from './api';
import type { ScreenDoc } from './contract';

export interface Route {
  screen: string;
  query?: string;
}

// Мини-роутер SDUI: без библиотек. Стек истории ведём сами,
// "back" приходит действием из схемы и выполняет здесь.
export function useScreen() {
  const [screen, setScreen] = useState<ScreenDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>({ screen: 'catalog' });
  const history = useRef<Route[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchScreen(route.screen, route.query)
      .then((s) => {
        if (alive) {
          setScreen(s);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (alive) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [route, refreshTick]);

  const navigate = useCallback((to: Route) => {
    setRoute((prev) => {
      history.current.push(prev);
      return to;
    });
  }, []);

  const goBack = useCallback(() => {
    const prev = history.current.pop();
    if (prev) setRoute(prev);
    else setRoute({ screen: 'catalog' });
  }, []);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  return { screen, loading, error, route, navigate, goBack, refresh };
}