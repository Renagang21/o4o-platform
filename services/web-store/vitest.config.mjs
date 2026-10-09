import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'] },
  test: {
    environment: 'jsdom',
    include: ['services/web-store/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
