import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Temporarily comment out Toaster until React version compatibility is fixed
// import { Toaster } from 'react-hot-toast'
import { MultiThemeProvider } from '@/shared/components/theme/MultiThemeContext'
import App from './App'
import './styles/globals.css'

// MSW 개발 환경 설정
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  const { worker } = await import('./test-utils/mocks/browser')
  
  // MSW 서비스 워커 시작
  return worker.start({
    onUnhandledRequest: 'bypass', // 처리되지 않은 요청은 실제 네트워크로 전달
  })
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
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MultiThemeProvider defaultTheme="light">
            <App />
            <div id="toaster" />
          </MultiThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  )
})