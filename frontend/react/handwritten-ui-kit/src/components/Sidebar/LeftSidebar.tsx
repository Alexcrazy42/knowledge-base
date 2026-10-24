import { useState } from "react";
import { Sidebar } from "./Sidebar";

export function LeftSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Открыть меню</button>

      <Sidebar
        opened={isOpen}
        onClose={() => setIsOpen(false)}
        position="left"
        width={280}
        title="Меню"
      >
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <a href="/" style={{ textDecoration: 'none', color: '#262626' }}>
                Главная
              </a>
            </li>
            <li style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <a href="/about" style={{ textDecoration: 'none', color: '#262626' }}>
                О нас
              </a>
            </li>
            <li style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <a href="/contact" style={{ textDecoration: 'none', color: '#262626' }}>
                Контакты
              </a>
            </li>
          </ul>
        </nav>
      </Sidebar>
    </div>
  );
}