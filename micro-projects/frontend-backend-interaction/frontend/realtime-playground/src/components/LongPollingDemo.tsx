import { useState, useEffect, useRef } from 'react';
import { longPollingApi } from '../services/api';

export function LongPollingDemo() {
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const isPolling = useRef(true);
    
    useEffect(() => {
        const poll = async () => {
            if (!isPolling.current) {
                console.log('🛑 Polling stopped by flag');
                return;
            }
            
            try {
                const response = await longPollingApi.receive();
                if (response.data && response.data.text) {
                    setMessages(prev => [...prev, response.data.text]);
                }
            } catch (error: any) {
                if (error.code !== 'ECONNABORTED') {
                    console.error('Long polling error:', error);
                }
            } finally {
                if (isPolling.current) {
                    poll();
                } else {
                    console.log('🛑 Stopping polling (flag is false)');
                }
            }
        };
    
        poll();
        
        return () => {
            console.log('🧹 Cleanup: stopping polling');
        };
    }, []);
    
    const sendMessage = async () => {
        if (!input.trim()) return;
        
        try {
            await longPollingApi.send(input);
            setInput('');
        } catch (error) {
            console.error('Send error:', error);
        }
    };
    
    return (
        <div className="demo-card">
            <h2>⏳ Long Polling</h2>
            <p className="status">Соединение держится до 30 секунд</p>
            
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