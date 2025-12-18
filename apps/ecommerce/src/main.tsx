import { StrictMode } from 'react';
import './utils/react-compat'; // React 19 호환성
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CookieAuthProvider } from '@o4o/auth-context';
import { PartnerProvider } from './hooks/usePartner';
import { router } from './router';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Auth client is already configured as singleton

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CookieAuthProvider>
        <PartnerProvider>
          <RouterProvider router={router} />
        </PartnerProvider>
      </CookieAuthProvider>
    </QueryClientProvider>
  </StrictMode>
);