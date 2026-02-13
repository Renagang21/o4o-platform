import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { initVersionCheck } from '@/utils/versionCheck'
import { globalRegistry } from '@o4o/shortcodes'
import App from './App'
import './styles/globals.css'
// WordPress styles will be loaded only when needed
// import './styles/o4o-admin-dashboard.css'
import './styles/dashboard-simple.css'
import './styles/bulk-actions.css'
import './styles/quick-edit.css'
import './styles/help-tab.css'
import './styles/media-upload.css'
// import './styles/ui-improvements.css' // Temporarily disabled to fix sidebar conflict
import './styles/o4o-table-fix.css'
// Toolset UI styles for CPT Engine
import './styles/toolset-ui.css'


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
      gcTime: 10 * 60 * 1000, // Keep cache for 10 minutes (gcTime replaced cacheTime in v5)
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
})

// Initialize version checking
initVersionCheck();

// Handle stale chunk errors from dynamic imports (배포 후 캐시 불일치 자동 새로고침)
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || '';
  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError')
  ) {
    const reloadKey = 'chunk-error-reload';
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();

    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(reloadKey, String(now));
      console.warn('Stale chunk detected (unhandledrejection), reloading...');
      window.location.reload();
    }
  }
});

// Debug: Expose globalRegistry to window (development only)
if (import.meta.env.DEV) {
  (window as any).__shortcodeRegistry = globalRegistry;
}

// Note: StrictMode disabled for Slate.js compatibility
// Slate's focus management conflicts with React's double-rendering in development mode
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
      <Toaster position="top-center" reverseOrder={false} />
    </BrowserRouter>
  </QueryClientProvider>,
)