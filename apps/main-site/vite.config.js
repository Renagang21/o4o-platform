import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    // @ts-expect-error vite 5.x plugin-react ↔ vite 6.x defineConfig type mismatch
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5175,
        host: true,
    },
});
