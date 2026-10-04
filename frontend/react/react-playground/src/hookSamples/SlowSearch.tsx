import { useState, useTransition } from 'react';

async function fakeSlowSearch(query: string): Promise<string[]> {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500));
  
  const baseResults = [
    'apple', 'apricot', 'banana', 'blueberry', 'cherry',
    'dragonfruit', 'durian', 'elderberry', 'fig', 'grape'
  ];

  const filtered = baseResults.filter((fruit) =>
    fruit.toLowerCase().includes(query.toLowerCase())
  );

  return filtered;
}


export function SlowSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (q: string) => {
    startTransition(async () => {
      const data = await fakeSlowSearch(q);
      setResults(data);  // Не блокирует ввод!
    });
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);   // ✅ Urgent (мгновенно)
          handleSearch(e.target.value);  // 🔄 Low-priority (не блокирует!)
        }}
      />
      {isPending ? '🔄 Searching...' : null}
      <ul>{results.map((r) => <li>{r}</li>)}</ul>
    </div>
  );
}
