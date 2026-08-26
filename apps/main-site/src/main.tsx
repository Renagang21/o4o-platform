import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider, OrganizationProvider } from './context';
import './index.css';

// WO-O4O-MAIN-SITE-APPSTORE-PARALLEL-AXIS-CENSUS-AND-RETIREMENT-V1:
//   부팅 시 initializeAppStore() 가 client-side AppRegistry 를 돌며
//   @o4o-apps/commerce·customer·admin manifest 를 찾다 실패하면 stub manifest 로
//   가짜 컴포넌트를 만들어 FunctionRegistry / UIComponentRegistry 에 주입했다.
//   세 패키지는 존재하지 않고, 주입 결과를 읽는 ViewRenderer 는 어디서도
//   import 되지 않아 실제 효과가 0 인 부팅 부작용이었다. 병렬축과 함께 제거한다.

// Performance: Optimized React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000, // Data stays fresh for 10 seconds
      gcTime: 5 * 60 * 1000, // Garbage collection after 5 minutes (formerly cacheTime)
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      refetchOnMount: false, // Don't refetch on component mount if data exists
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <OrganizationProvider>
            <App />
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
