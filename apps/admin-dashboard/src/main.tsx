import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { MultiThemeProvider } from '@/shared/components/theme/MultiThemeContext'
import App from './App'
import './styles/globals.css'

// MSW 개발 환경 설정
async function enableMocking() {
  // Check if mocking is enabled via environment variable
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'
  
  if (!import.meta.env.DEV || !useMock) {
    console.log('[MSW] Mocking disabled, using real API')
    return
  }

  try {
    const { worker } = await import('./test-utils/mocks/browser')
    
    console.log('[MSW] Starting mock service worker...')
    // MSW 서비스 워커 시작
    return worker.start({
      onUnhandledRequest: 'bypass', // 처리되지 않은 요청은 실제 네트워크로 전달
      quiet: false, // Show MSW logs for debugging
    })
  } catch (error) {
    console.error('Failed to start MSW:', error)
    // MSW 실패해도 앱은 계속 실행
    return Promise.resolve()
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// MSW를 시작한 후 앱 렌더링
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MultiThemeProvider defaultTheme="light">
            <App />
            <Toaster position="top-center" reverseOrder={false} />
          </MultiThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
})