import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { vi } from 'vitest';
import { useProducts, useProduct, useCreateProduct } from '../../src/hooks/useProducts';
import { EcommerceApi } from '../../src/api/ecommerceApi';
import { createMockProduct, createMockProducts } from '../../src/test-utils/factories/product';

// EcommerceApi 모킹
vi.mock('../../src/api/ecommerceApi', () => ({
  EcommerceApi: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    duplicateProduct: vi.fn(),
  },
}));

// QueryClient wrapper 생성 함수
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  });

  // React 컴포넌트로 wrapper 정의
  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return TestWrapper;
};

describe('useProducts Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useProducts (목록 조회)', () => {
    test('상품 목록을 성공적으로 조회한다', async () => {
      const mockProducts = [
        createMockProduct({ name: 'Product 1' }),
        createMockProduct({ name: 'Product 2' }),
      ];
      
      const mockResponse = {
        data: mockProducts,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      vi.mocked(EcommerceApi.getProducts).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useProducts(1, 20, {}), 
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EcommerceApi.getProducts).toHaveBeenCalledWith(1, 20, {});
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.data).toHaveLength(2);
    });

    test('필터 조건이 올바르게 전달된다', async () => {
      const filters = { status: 'published', category: 'electronics' };
      
      vi.mocked(EcommerceApi.getProducts).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      renderHook(
        () => useProducts(1, 20, filters), 
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(EcommerceApi.getProducts).toHaveBeenCalledWith(1, 20, filters);
      });
    });

    test('API 에러 시 적절히 처리된다', async () => {
      const errorMessage = 'Network Error';
      vi.mocked(EcommerceApi.getProducts).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(
        () => useProducts(), 
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
    });
  });

  describe('useProduct (단일 조회)', () => {
    test('단일 상품을 성공적으로 조회한다', async () => {
      const mockProduct = createMockProduct({ 
        id: 'prod_123',
        name: 'Test Product' 
      });
      
      const mockResponse = {
        success: true,
        data: mockProduct,
      };

      vi.mocked(EcommerceApi.getProduct).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useProduct('prod_123'), 
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EcommerceApi.getProduct).toHaveBeenCalledWith('prod_123');
      expect(result.current.data?.data).toEqual(mockProduct);
    });

    test('productId가 없으면 쿼리가 비활성화된다', () => {
      const { result } = renderHook(
        () => useProduct(''), 
        { wrapper: createTestWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(EcommerceApi.getProduct).not.toHaveBeenCalled();
    });

    test('enabled가 false면 쿼리가 비활성화된다', () => {
      const { result } = renderHook(
        () => useProduct('prod_123', false), 
        { wrapper: createTestWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(EcommerceApi.getProduct).not.toHaveBeenCalled();
    });
  });

  describe('useCreateProduct (생성)', () => {
    test('상품을 성공적으로 생성한다', async () => {
      const newProduct = createMockProducts.draft();
      const mockResponse = {
        success: true,
        data: { ...newProduct, status: 'published' as const },
      };

      vi.mocked(EcommerceApi.createProduct).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useCreateProduct(), 
        { wrapper: createTestWrapper() }
      );

      result.current.mutate(newProduct);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EcommerceApi.createProduct).toHaveBeenCalledWith(newProduct);
    });

    test('생성 실패 시 에러를 처리한다', async () => {
      const errorResponse = {
        response: {
          data: { message: 'Validation failed' }
        }
      };
      
      vi.mocked(EcommerceApi.createProduct).mockRejectedValue(errorResponse);

      const { result } = renderHook(
        () => useCreateProduct(), 
        { wrapper: createTestWrapper() }
      );

      result.current.mutate(createMockProducts.draft());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(errorResponse);
    });
  });
});