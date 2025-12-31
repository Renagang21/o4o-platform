/**
 * Neture App
 *
 * Phase G-2: B2C 핵심 기능 확장
 * 메인 앱 컴포넌트 + Context Providers
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, CartProvider } from '@/contexts';
import { NetureRouter } from '@/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <NetureRouter />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
