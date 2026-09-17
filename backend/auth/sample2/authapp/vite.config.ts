import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5033', // Ваш первый бэкенд
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/auth-api': {
        target: 'https://localhost:7205',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth-api/, '')
      }
    }
  }
})