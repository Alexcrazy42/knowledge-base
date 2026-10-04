import { useEffect, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';

export function Debounce() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);  // 500ms задержка

  useEffect(() => {
    if (debouncedQuery) {
      console.log('Search:', debouncedQuery);
    }
  }, [debouncedQuery]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Type to search..."
    />
  );
}
