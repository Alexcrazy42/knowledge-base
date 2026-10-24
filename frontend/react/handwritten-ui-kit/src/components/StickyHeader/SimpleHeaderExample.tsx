import { StickyHeader } from './StickyHeader';

export function SimpleHeaderExample() {
  return (
    <div>
      <StickyHeader>
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0 }}>Логотип</h1>
          <nav>
            <a href="/" style={{ marginRight: '16px' }}>Главная</a>
            <a href="/about">О нас</a>
          </nav>
        </div>
      </StickyHeader>

      <div style={{ padding: '20px' }}>
        {Array.from({ length: 50 }, (_, i) => (
          <p key={i}>Параграф {i + 1}</p>
        ))}
      </div>
    </div>
  );
}