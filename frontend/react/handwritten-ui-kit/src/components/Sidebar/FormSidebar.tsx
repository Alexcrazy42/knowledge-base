import { useState } from "react";
import { Sidebar } from "./Sidebar";

export function FormSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Редактировать профиль</button>

      <Sidebar
        opened={isOpen}
        onClose={() => setIsOpen(false)}
        title="Редактирование профиля"
        width={400}
      >
        <form onSubmit={(e) => { e.preventDefault(); setIsOpen(false); }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Имя
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Биография
            </label>
            <textarea
              rows={4}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                background: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: '#1890ff',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Сохранить
            </button>
          </div>
        </form>
      </Sidebar>
    </div>
  );
}