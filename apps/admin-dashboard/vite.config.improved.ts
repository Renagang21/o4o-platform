import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// ✅ 안정적이고 예측 가능한 개발 서버 설정
export default defineConfig({
  plugins: [react()],
  
  // 🔧 포트 및 네트워크 설정 통일
  server: {
    port: 3001,           // package.json과 완전 통일
    host: '0.0.0.0',      // WSL2 호환성 보장
    strictPort: true,     // 포트 고정 (폴백 방지)
    cors: true,           // CORS 활성화
    fs: { strict: false }, // 파일 시스템 접근 완화
    
    // 🛡️ 자동화 도구 안정성 향상
    hmr: {
      port: 3002,         // HMR 전용 포트 분리
      host: '0.0.0.0'
    },
    
    // 🔄 프로세스 관리 개선
    watch: {
      usePolling: true,   // WSL2 파일 감지 안정성
      interval: 1000      // 감지 간격 조정
    }
  },
  
  // 🎯 경로 별칭 정리 (충돌 방지)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/styles': path.resolve(__dirname, './src/styles')
    }
  },
  
  // 📦 빌드 설정 최적화
  build: {
    outDir: 'dist',
    sourcemap: true,
    // 🛠️ 자동화 도구 호환성
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  },
  
  // 🚀 개발 환경 최적화
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@o4o/auth-client', '@o4o/auth-context'] // 로컬 패키지 제외
  },
  
  // 📱 환경 변수 처리
  define: {
    __DEV_PORT__: '3001',
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:4000')
  },
  
  // 🔧 로깅 및 디버깅
  logLevel: 'info',
  clearScreen: false  // WSL2에서 화면 클리어 방지
})