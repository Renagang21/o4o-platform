import { FC, ReactNode, ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// 테스트용 QueryClient 생성
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// 모든 Provider를 포함한 Wrapper
interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders: React.FC<AllProvidersProps> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllProviders, ...options });
};

// re-export everything
export * from '@testing-library/react';
export { customRender as render };

// 테스트 헬퍼 함수들
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

// Mock 토스트 함수 (Vitest 사용)
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
};

// 토스트 모킹 설정 (react-hot-toast가 설치되어 있지 않으므로 임시)
export const setupToastMocks = () => {
  // 실제 토스트 라이브러리가 import되면 여기서 모킹
  return mockToast;
};

// 토스트 모킹 정리
export const clearToastMocks = () => {
  mockToast.success.mockClear();
  mockToast.error.mockClear();
  mockToast.loading.mockClear();
  mockToast.dismiss.mockClear();
};