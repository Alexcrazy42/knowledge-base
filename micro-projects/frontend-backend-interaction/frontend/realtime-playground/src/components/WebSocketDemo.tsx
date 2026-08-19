import { useState, useEffect, useRef } from 'react';
import { WebSocketService } from '../services/websocket';

export function WebSocketDemo() {
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const wsService = useRef<WebSocketService | null>(null);
    
    useEffect(() => {
        wsService.current = new WebSocketService();
        
        const connect = async () => {
            try {
                await wsService.current!.connect((data) => {
                    setMessages(prev => [...prev, data.text]);
                });
                setIsConnected(true);
            } catch (error) {
                console.error('WebSocket connection error:', error);
            }
        };
        
        connect();
        
        return () => {
            wsService.current?.disconnect();
        };
    }, []);
    
    const sendMessage = () => {
        if (!input.trim() || !wsService.current) return;
        
        wsService.current.sendMessage(input);
        setInput('');
    };
    
    return (
        <div className="demo-card">
            <h2>🔌 WebSocket</h2>
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