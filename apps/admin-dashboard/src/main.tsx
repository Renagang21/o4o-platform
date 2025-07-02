import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
// Temporarily comment out Toaster until React version compatibility is fixed
// import { Toaster } from 'react-hot-toast'
import { MultiThemeProvider } from '@o4o/ui/theme/MultiThemeContext'
import App from './App'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

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