import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Force React to use single version
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, '../../node_modules/react-router-dom')
    },
    dedupe: ['react', 'react-dom', 'react-router-dom']
  },
  server: {
    port: 4101,
    host: 'localhost',
    strictPort: false,
    proxy: {
      '/api': {
        target: 'https://api.neture.co.kr',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development'
  }
})
