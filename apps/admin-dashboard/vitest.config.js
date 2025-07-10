import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test-utils/setup.ts'],
        testTimeout: 10000,
        hookTimeout: 10000,
        teardownTimeout: 10000,
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/cypress/**',
            '**/*.{playwright,e2e}.{js,ts}',
            '**/e2e/**',
            '**/*.spec.ts',
            '**/*.e2e.{js,ts}',
            '**/test-results/**',
            '**/playwright-report/**',
            '**/coverage/**',
            '**/*.config.{js,ts}',
            '**/tests/e2e/**'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test-utils/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.ts',
                '**/*.config.js',
                'dist/',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@o4o/ui': path.resolve(__dirname, '../../packages/ui'),
            '@o4o/lib': path.resolve(__dirname, '../../packages/lib'),
            '@o4o/types': path.resolve(__dirname, '../../packages/types'),
        },
    },
});
//# sourceMappingURL=vitest.config.js.map