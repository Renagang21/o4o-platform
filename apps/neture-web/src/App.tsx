/**
 * Neture App
 *
 * Phase D-2: Neture Web Server (B2C) 구축
 * 메인 앱 컴포넌트
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      <NetureRouter />
    </QueryClientProvider>
  );
}
