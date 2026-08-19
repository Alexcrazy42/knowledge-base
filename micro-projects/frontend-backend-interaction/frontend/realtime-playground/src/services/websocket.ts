import * as signalR from '@microsoft/signalr';

export class WebSocketService {
    private connection: signalR.HubConnection | null = null;
    
    connect(onMessage: (data: any) => void): Promise<void> {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl('http://localhost:5009/chatHub')
            .withAutomaticReconnect()
            .build();
        
        this.connection.on('ReceiveMessage', (message) => {
            onMessage(message);
        });
        
        return this.connection.start();
    }
    
    sendMessage(text: string): void {
        if (!this.connection) return;
        
        this.connection.invoke('SendMessage', { text });
    }
    
    disconnect(): void {
        this.connection?.stop();
        this.connection = null;
    }
}