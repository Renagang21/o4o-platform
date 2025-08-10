import { defineConfig, mergeConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { sharedViteConfig } from '../../vite.config.shared'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig(mergeConfig(sharedViteConfig, {
  resolve: {
    preserveSymlinks: true,
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@o4o/types': path.resolve(__dirname, '../../packages/types/src'),
      '@o4o/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@o4o/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@o4o/auth-client': path.resolve(__dirname, '../../packages/auth-client/src'),
      '@o4o/auth-context': path.resolve(__dirname, '../../packages/auth-context/src'),
      '@o4o/config': path.resolve(__dirname, '../../packages/config'),
    },
  },
  optimizeDeps: {
    exclude: ['@o4o/supplier-connector', '@o4o/types', '@o4o/utils', '@o4o/ui', '@o4o/auth-client', '@o4o/auth-context']
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.VITE_DEV_SERVER_PORT || '3000'),
    strictPort: false,
    allowedHosts: [
      'neture.co.kr',
      'www.neture.co.kr',
      'shop.neture.co.kr',
      'forum.neture.co.kr',
      'signage.neture.co.kr',
      'funding.neture.co.kr',
      'admin.neture.co.kr',
      'localhost',
      '127.0.0.1'
    ],
    fs: {
      allow: ['..', '../..']
    }
  }
}))
