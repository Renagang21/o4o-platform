import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { MultiThemeProvider } from '@/shared/components/theme/MultiThemeContext'
import App from './App'
import './styles/globals.css'

// MSW 개발 환경 설정 - 임시로 비활성화
async function enableMocking() {
  // MSW 임시 비활성화 - 백지 화면 문제 해결을 위해
  return Promise.resolve();
  
  // if (!import.meta.env.DEV) {
  //   return
  // }

  // const { worker } = await import('./test-utils/mocks/browser')
  
  // // MSW 서비스 워커 시작
  // return worker.start({
  //   onUnhandledRequest: 'bypass', // 처리되지 않은 요청은 실제 네트워크로 전달
  // })
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
            <Toaster position="top-center" reverseOrder={false} />
          </MultiThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  )
})