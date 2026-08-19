import { useState, useEffect } from 'react';
import { pollingApi } from '../services/api';

export function PollingDemo() {
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState('');
    
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await pollingApi.receive();
                if (response.data.length > 0) {
                    setMessages(prev => [
                        ...prev,
                        ...response.data.map((m: any) => m.text)
                    ]);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000); // Опрашиваем каждые 3 секунды
        
        return () => clearInterval(interval);
    }, []);
    
    const sendMessage = async () => {
        if (!input.trim()) return;
        
        try {
            await pollingApi.send(input);
            setInput('');
        } catch (error) {
            console.error('Send error:', error);
        }
    };
    
    return (
        <div className="demo-card">
            <h2>🔄 Polling</h2>
            <p className="status">Опрос каждые 3 секунды</p>
            
            <div className="input-group">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Введите сообщение..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage}>Отправить</button>
            </div>
            
            <div className="messages">
                {messages.map((msg, i) => (
                    <div key={i} className="message">{msg}</div>
                ))}
            </div>
        </div>
    );
}