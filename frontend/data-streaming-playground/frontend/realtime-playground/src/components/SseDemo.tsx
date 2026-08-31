import { useState, useEffect } from 'react';
import { sseApi } from '../services/api';

export function SseDemo() {
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    
    useEffect(() => {
        const eventSource = new EventSource('http://localhost:5009/api/sse/stream');
        
        eventSource.onopen = () => {
            setIsConnected(true);
            console.log('SSE connected');
        };
        
        eventSource.onmessage = (event) => {
            try {
                console.log('event from sse: ', event.data)
                const data = JSON.parse(event.data);
                setMessages(prev => [...prev, data.Text]);  
            } catch (error) {
                console.error('SSE parse error:', error);
            }
        };
        
        eventSource.onerror = () => {
            setIsConnected(false);
            console.error('SSE error');
        };
        
        return () => {
            eventSource.close();
        };
    }, []);
    
    const sendMessage = async () => {
        if (!input.trim()) return;
        
        try {
            await sseApi.send(input);
            setInput('');
        } catch (error) {
            console.error('Send error:', error);
        }
    };
    
    return (
        <div className="demo-card">
            <h2>📨 Server-Sent Events</h2>
            <p className="status">
                {isConnected ? '🟢 Подключено' : '🔴 Отключено'}
            </p>
            
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