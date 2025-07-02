import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      // Shared components aliases
      '@shared': path.resolve(__dirname, '../../shared'),
      '@shared/components/admin': path.resolve(__dirname, '../../shared/components/admin'),
      '@shared/components/editor': path.resolve(__dirname, '../../shared/components/editor'),
      '@shared/components/theme': path.resolve(__dirname, '../../shared/components/theme'),
      '@shared/components/ui': path.resolve(__dirname, '../../shared/components/ui'),
      '@shared/components/dropshipping': path.resolve(__dirname, '../../shared/components/dropshipping'),
      '@shared/components/healthcare': path.resolve(__dirname, '../../shared/components/healthcare'),
    }
  },
  server: {
    port: 3012,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})