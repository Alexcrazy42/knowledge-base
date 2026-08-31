import './App.css';
import { PollingDemo } from './components/PollingDemo';
import { LongPollingDemo } from './components/LongPollingDemo';
import { SseDemo } from './components/SseDemo';
import { WebSocketDemo } from './components/WebSocketDemo';
import { FileDemo } from './components/FileDemo';

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>⚡ Real-Time Playground</h1>
        <p>Сравнение транспортных протоколов в реальном времени</p>
      </header>

      <div className="demos-grid">
        <PollingDemo />
        <LongPollingDemo />
        <SseDemo />
        <WebSocketDemo />
        <FileDemo />
      </div>
    </div>
  );
}

export default App;