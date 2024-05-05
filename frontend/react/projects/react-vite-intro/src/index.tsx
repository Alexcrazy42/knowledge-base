import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from '@/App'

const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);
root.render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);