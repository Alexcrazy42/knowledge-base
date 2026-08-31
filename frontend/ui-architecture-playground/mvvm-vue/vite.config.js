// ============================================================================
// Vite: сборщик для Vue. В отличие от vanillajs-mvp здесь ЕСТЬ этап сборки -
// .vue файлы (Single File Components) браузер сам не поймёт.
// Запуск: npm install && npm run dev
// ============================================================================

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
});
