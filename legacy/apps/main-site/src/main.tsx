import { StrictMode } from 'react';
import './utils/react-compat'; // React 19 호환성
import './utils/iframe-context'; // iframe 컨텍스트 초기화 (가장 먼저)
import './index.css';
import './styles/wordpress-blocks.css';
import './styles/markdown-reader.css';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastProvider';
import { initializeIframeContext } from './utils/iframe-context';
import App from './App';

// Shortcode registration
import { globalRegistry } from '@o4o/shortcodes';
import { loadShortcodes, logShortcodeSummary } from './utils/shortcode-loader';

// React 시작 전에 iframe 컨텍스트 초기화
initializeIframeContext();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize app with async shortcode loading
async function initializeApp() {
  // Load and register all shortcodes BEFORE rendering React
  const stats = await loadShortcodes();
  logShortcodeSummary(stats);

  // Debug: Expose globalRegistry to window (development only)
  if (import.meta.env.DEV) {
    (window as any).__shortcodeRegistry = globalRegistry;
  }

  // Render React app after shortcodes are loaded
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}

// Start app initialization
initializeApp(); 
