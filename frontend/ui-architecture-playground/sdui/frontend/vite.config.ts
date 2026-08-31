import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Frontend: http://localhost:5210, API шлётся на .NET backend (7120) через proxy,
// чтобы не было CORS и клиент работал same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5210,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:7120',
    },
  },
});