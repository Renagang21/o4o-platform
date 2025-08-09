import './react-shim'; // React 19 compatibility - MUST be first
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { MultiThemeProvider } from '@/shared/components/theme/MultiThemeContext'
import App from './App'
import './styles/globals.css'
import './styles/wordpress-dashboard.css'
import './styles/dashboard-simple.css'
import './styles/bulk-actions.css'
import './styles/quick-edit.css'
import './styles/help-tab.css'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 404 or 401 errors
        if (error?.response?.status === 404 || error?.response?.status === 401) {
          return false;
        }
        // Retry up to 1 time for other errors
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
      cacheTime: 10 * 60 * 1000, // Keep cache for 10 minutes
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
})

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