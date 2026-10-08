import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Run from the repository root, using the existing test dependencies.
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['services/web-lecture/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
