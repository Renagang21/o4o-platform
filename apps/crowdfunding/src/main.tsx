import { StrictMode } from 'react';
import './utils/react-compat'; // React 19 호환성
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { AuthProvider } from '@o4o/auth-context';
// 임시: auth-context 빌드 문제로 인한 mock
import { ReactNode } from 'react';
const AuthProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
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
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);