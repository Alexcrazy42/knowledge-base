import axios from 'axios';

const API_BASE = 'http://localhost:5009/api'; // Ваш порт может отличаться

export const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Polling
export const pollingApi = {
    send: (text: string) => 
        api.post('/polling/send', { text }),
    receive: () => 
        api.get('/polling/receive'),
};

// Long Polling
export const longPollingApi = {
    send: (text: string) => 
        api.post('/longpolling/send', { text }),
    receive: () => 
        api.get('/longpolling/long-polling-receive', { timeout: 35000 }), // 35 сек таймаут
};

// SSE
export const sseApi = {
    send: (text: string) => 
        api.post('/sse/send', { text }),
};