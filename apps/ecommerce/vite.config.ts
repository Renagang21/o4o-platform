import { defineConfig, mergeConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { sharedViteConfig } from '../../vite.config.shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(mergeConfig(sharedViteConfig, {
  base: '/shop/',
  server: {
    port: 3002,
    host: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@o4o/types': path.resolve(__dirname, '../../packages/types/src'),
      '@o4o/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@o4o/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@o4o/auth-client': path.resolve(__dirname, '../../packages/auth-client/src'),
      '@o4o/auth-context': path.resolve(__dirname, '../../packages/auth-context/src')
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 공통 설정 먼저 적용
          const sharedChunk = sharedViteConfig.build?.rollupOptions?.output?.manualChunks?.(id);
          if (sharedChunk) return sharedChunk;
          
          // 큰 페이지들을 별도 청크로 분리
          if (id.includes('/src/pages/')) {
            if (id.includes('ProductDetail') || id.includes('Cart') || id.includes('Checkout')) {
              return 'shop-pages';
            }
            if (id.includes('Profile') || id.includes('Orders') || id.includes('Account')) {
              return 'user-pages';
            }
          }
          
          // 큰 컴포넌트들을 별도 청크로 분리
          if (id.includes('/src/components/')) {
            if (id.includes('ProductGrid') || id.includes('ProductCard') || id.includes('Filter')) {
              return 'product-components';
            }
            if (id.includes('Cart') || id.includes('Checkout') || id.includes('Payment')) {
              return 'cart-components';
            }
          }
        }
      }
    }
  },
}));