import { useCallback, useState, useTransition, useEffect } from "react";

export function TabsSearch() {
  const [tab, setTab] = useState<'users' | 'products'>('users');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);  // ❌ Было отсутствует!
  const [isPending, startTransition] = useTransition();

  // ✅ Fake API (внутри компонента)
  const fetchTabData = async (newTab: string, q: string): Promise<string[]> => {
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 600)); // 800-1400ms
    
    const users = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
    const products = ['Laptop', 'Phone', 'Tablet', 'Watch', 'Headphones'];
    
    const data = newTab === 'users' ? users : products;
    return data.filter((item) => item.toLowerCase().includes(q.toLowerCase()));
  };

  const loadTab = useCallback((newTab: 'users' | 'products') => {
    startTransition(async () => {
      try {
        const data = await fetchTabData(newTab, query);
        setTab(newTab);
        setResults(data);
      } catch (error) {
        console.error('Tab load failed:', error);
        setResults([]);
      }
    });
  }, [query]);  // ✅ deps OK (query влияет на результаты)

  // ✅ Reset results при смене query
  useEffect(() => {
    setResults([]);  // Очистка при новом поиске
  }, [query]);

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '500px', 
      fontFamily: 'system-ui' 
    }}>
      <h2 style={{ marginBottom: '24px' }}>🔄 Tabs + Search + useTransition</h2>
      
      {/* 🔍 Поиск */}
      <div style={{ marginBottom: '20px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users/products..."
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '16px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        />
      </div>

      {/* 📂 Tabs */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px',
          background: '#f8fafc',
          padding: '12px',
          borderRadius: '8px'
        }}
      >
        <button
          onClick={() => loadTab('users')}
          disabled={tab === 'users' || isPending}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            background: tab === 'users' ? '#3b82f6' : '#e5e7eb',
            color: tab === 'users' ? 'white' : 'black',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          👥 Users
        </button>
        
        <button
          onClick={() => loadTab('products')}
          disabled={tab === 'products' || isPending}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            background: tab === 'products' ? '#10b981' : '#e5e7eb',
            color: tab === 'products' ? 'white' : 'black',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          📦 Products
        </button>
      </div>

      {/* 📊 Status + Results */}
      <div>
        {isPending && (
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(90deg, #eff6ff, #dbeafe)',
            borderRadius: '8px',
            marginBottom: '16px',
            color: '#1e40af',
            fontWeight: 500,
          }}>
            🔄 {tab === 'users' ? 'Searching users...' : 'Loading products...'}
          </div>
        )}

        <div style={{ 
          padding: '16px', 
          background: '#f8fafc', 
          borderRadius: '8px',
          minHeight: '200px'
        }}>
          <div style={{ 
            marginBottom: '12px', 
            fontSize: '14px', 
            color: '#6b7280',
            fontWeight: 500
          }}>
            Active: <strong>{tab}</strong> | Query: <em>"{query}"</em>
          </div>
          
          {results.length ? (
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {results.map((item, index) => (
                <li 
                  key={`${tab}-${item}-${index}`}
                  style={{ 
                    padding: '4px 0', 
                    borderBottom: '1px solid #e5e7eb' 
                  }}
                >
                  {tab === 'users' ? '👤' : '📦'} {item}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ 
              padding: '40px 20px', 
              textAlign: 'center', 
              color: '#9ca3af',
              fontStyle: 'italic'
            }}>
              {query ? 'No results found' : 'Click tab or search...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
