import { StrictMode } from 'react';
import './utils/react-compat'; // React 19 호환성
import './utils/iframe-context'; // iframe 컨텍스트 초기화 (가장 먼저)
import './index.css';
import './styles/wordpress-blocks.css';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeIframeContext } from './utils/iframe-context';
import App from './App';

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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
); 