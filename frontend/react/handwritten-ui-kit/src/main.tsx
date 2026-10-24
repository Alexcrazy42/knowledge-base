import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ToastProvider } from './components/Toast/ToastContext.tsx'
import { ToastContainer } from './components/Toast/ToastContainer.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
      <ToastContainer />
    </ToastProvider>
  </StrictMode>,
)
