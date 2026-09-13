import { useEffect, useState } from "react";

function Info() {
    const [items, setItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('Нет токена доступа');
            }
            const response = await fetch('/api/Order', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ошибка! статус: ${response.status}`);
            }

            const json = await response.json();
            
            if (!Array.isArray(json)) {
                setItems([]);
            } else {
                setItems(json);
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log('📌 Компонент Info смонтирован');
        fetchItems();
        
        return () => {
            console.log('🗑️ Компонент Info размонтирован');
        };
    }, []);

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>⏳ Загрузка данных...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ color: 'red' }}>❌ Ошибка: {error}</p>
                <button 
                    onClick={fetchItems} 
                    style={{ marginTop: '10px', padding: '8px 16px' }}
                >
                    Повторить
                </button>
            </div>
        );
    }

    if (!items || items.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                <p>📭 Нет элементов для отображения</p>
                <button 
                    onClick={fetchItems} 
                    style={{ marginTop: '10px', padding: '8px 16px' }}
                >
                    Обновить
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h3>📋 Список ({items.length})</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {items.map((item, index) => (
                    <li 
                        key={index}
                        style={{
                            padding: '10px 12px',
                            marginBottom: '6px',
                            background: '#f3f4f6',
                            borderRadius: '8px',
                        }}
                    >
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Info;