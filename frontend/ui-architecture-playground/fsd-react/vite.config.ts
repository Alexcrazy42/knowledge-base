// ============================================================================
// Vite для React + TypeScript. Отличие от mvvm-vue только в плагине
// (@vitejs/plugin-react вместо @vitejs/plugin-vue) и в алиасе "@":
// FSD-слайсы импортируют друг друга как @shared/ui, @entities/task и т.д.,
// поэтому относительные цепочки "../../.." не нужны.
//
// Порт фиксирован (5197), чтобы каждый проект playground'а жил на своём порту:
//   5199 - mvvm-vue, 5201 - mvvm-angular, 5197 - этот проект.
// ============================================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 5197,
        strictPort: true,
    },
});
