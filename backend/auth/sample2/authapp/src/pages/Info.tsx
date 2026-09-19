import { useEffect, useState } from "react";

// Типы данных
interface GitHubRepo {
    id: number;
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    language: string | null;
    stargazersCount: number;
    forksCount: number;
    private: boolean;
}

function Info() {
    // Состояние для заказов (items)
    const [items, setItems] = useState<string[]>([]);
    
    // Состояние для репозиториев
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    
    // Общие состояния загрузки и ошибки
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('Нет токена доступа');

            const response = await fetch('/api/Order', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) throw new Error(`HTTP ошибка! статус: ${response.status}`);

            const json = await response.json();
            setItems(Array.isArray(json) ? json : []);
        } catch (err) {
            console.error("Ошибка при загрузке заказов:", err);
            // Не прерываем выполнение, если упали только заказы, 
            // но можно сохранить ошибку локально если нужно
        }
    };

    const fetchRepos = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('Нет токена доступа');

            const response = await fetch('/auth-api/api/GitHub/get-repos', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                // Если 401, возможно токен истек или отозван GitHub
                if (response.status === 401) {
                    throw new Error('Ошибка авторизации GitHub. Попробуйте войти заново.');
                }
                throw new Error(`HTTP ошибка! статус: ${response.status}`);
            }

            const json = await response.json();
            setRepos(Array.isArray(json) ? json : []);
        } catch (err) {
            console.error("Ошибка при загрузке репозиториев:", err);
            throw err; // Пробрасываем ошибку выше, чтобы показать пользователю
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Запускаем оба запроса параллельно
                await Promise.all([
                    fetchItems(),
                    fetchRepos()
                ]);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Неизвестная ошибка при загрузке данных');
            } finally {
                setLoading(false);
            }
        };

        console.log('📌 Компонент Info смонтирован');
        loadData();
        
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
                    onClick={() => window.location.reload()} 
                    style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}
                >
                    Обновить страницу
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            
            {/* Секция Заказов */}
            <div style={{ marginBottom: '30px' }}>
                <h3>📋 Список заказов ({items.length})</h3>
                {items.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>Нет активных заказов</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {items.map((item, index) => (
                            <li 
                                key={index}
                                style={{
                                    padding: '10px 12px',
                                    marginBottom: '6px',
                                    background: '#f3f4f6',
                                    borderRadius: '8px',
                                    borderLeft: '4px solid #3b82f6'
                                }}
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Секция Репозиториев GitHub */}
            <div>
                <h3>🐙 GitHub Репозитории ({repos.length})</h3>
                {repos.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>Репозитории не найдены или нет доступа</p>
                ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {repos.map((repo) => (
                            <div 
                                key={repo.id}
                                style={{
                                    padding: '15px',
                                    background: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>
                                            <a 
                                                href={repo.htmlUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{ textDecoration: 'none', color: '#2563eb' }}
                                            >
                                                {repo.name}
                                            </a>
                                        </h4>
                                        {repo.description && (
                                            <p style={{ margin: '0 0 8px 0', color: '#4b5563', fontSize: '0.9rem' }}>
                                                {repo.description}
                                            </p>
                                        )}
                                    </div>
                                    {repo.private && (
                                        <span style={{ 
                                            background: '#fef3c7', 
                                            color: '#92400e', 
                                            padding: '2px 8px', 
                                            borderRadius: '12px', 
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}>
                                            Private
                                        </span>
                                    )}
                                </div>
                                
                                <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', color: '#6b7280', marginTop: '10px' }}>
                                    {repo.language && (
                                        <span>🔵 {repo.language}</span>
                                    )}
                                    <span>⭐ {repo.stargazersCount}</span>
                                    <span>🍴 {repo.forksCount}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Info;