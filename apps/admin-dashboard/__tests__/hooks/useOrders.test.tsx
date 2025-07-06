import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { useOrders, useOrder, useUpdateOrderStatus, useRefundOrder, useBulkOrderAction } from '../../src/hooks/useOrders';
import { EcommerceApi } from '../../src/api/ecommerceApi';
import { createMockOrder, createMockOrders } from '../../src/test-utils/factories/order';

// EcommerceApi 모킹
vi.mock('../../src/api/ecommerceApi', () => ({
  EcommerceApi: {
    getOrders: vi.fn(),
    getOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
    refundOrder: vi.fn(),
    bulkOrderAction: vi.fn(),
  },
}));

// QueryClient wrapper 생성 함수
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
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

describe('useOrders Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useOrders (목록 조회)', () => {
    test('주문 목록을 성공적으로 조회한다', async () => {
      const mockOrders = [
        createMockOrder({ id: 'order_1', status: 'pending' }),
        createMockOrder({ id: 'order_2', status: 'completed' }),
      ];
      
      const mockResponse = {
        data: mockOrders,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      vi.mocked(EcommerceApi.getOrders).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useOrders(1, 20, {}), 
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EcommerceApi.getOrders).toHaveBeenCalledWith(1, 20, {});
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.data).toHaveLength(2);
    });

    test('상태 필터 조건이 올바르게 전달된다', async () => {
      const filters = { status: 'pending', customerId: 'customer_123' };
      
      vi.mocked(EcommerceApi.getOrders).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      renderHook(
        () => useOrders(1, 20, filters), 
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(EcommerceApi.getOrders).toHaveBeenCalledWith(1, 20, filters);
      });
    });

    test('API 에러 시 적절히 처리된다', async () => {
      const errorMessage = 'Server Error';
      vi.mocked(EcommerceApi.getOrders).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(
        () => useOrders(), 
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
    });

    test('로딩 상태가 올바르게 관리된다', async () => {
      // 지연된 Promise로 로딩 상태 테스트
      const delayedPromise = new Promise(resolve => 
        setTimeout(() => resolve({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }), 100)
      );

      vi.mocked(EcommerceApi.getOrders).mockReturnValue(delayedPromise);

      const { result } = renderHook(
        () => useOrders(), 
        { wrapper: createTestWrapper() }
      );

      // 초기 로딩 상태 확인
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useOrder (단일 조회)', () => {
    test('단일 주문을 성공적으로 조회한다', async () => {
      const mockOrder = createMockOrder({ 
        id: 'order_123',
        status: 'pending',
        total: 15000
      });
      
      const mockResponse = {
        success: true,
        data: mockOrder,
      };

      vi.mocked(EcommerceApi.getOrder).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useOrder('order_123'), 
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EcommerceApi.getOrder).toHaveBeenCalledWith('order_123');
      expect(result.current.data?.data).toEqual(mockOrder);
    });

    test('orderId가 없으면 쿼리가 비활성화된다', () => {
      const { result } = renderHook(
        () => useOrder(''), 
        { wrapper: createTestWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(EcommerceApi.getOrder).not.toHaveBeenCalled();
    });

    test('enabled가 false면 쿼리가 비활성화된다', () => {
      const { result } = renderHook(
        () => useOrder('order_123', false), 
        { wrapper: createTestWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(EcommerceApi.getOrder).not.toHaveBeenCalled();
    });

    test('주문 조회 실패 시 에러를 처리한다', async () => {
      const errorMessage = 'Order not found';
      vi.mocked(EcommerceApi.getOrder).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(
        () => useOrder('order_123'), 
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
    });
  });

  describe('useUpdateOrderStatus (상태 업데이트)', () => {
    test('주문 상태를 성공적으로 업데이트한다', async () => {
      const orderId = 'order_123';
      const newStatus = 'completed';
      const mockResponse = {
        success: true,
        data: createMockOrder({ id: orderId, status: newStatus }),
      };

      vi.mocked(EcommerceApi.updateOrderStatus).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useUpdateOrderStatus(), 
        { wrapper: createTestWrapper() }
      );

      result.current.mutate({ orderId, status: newStatus });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EcommerceApi.updateOrderStatus).toHaveBeenCalledWith(orderId, newStatus, undefined);
      expect(result.current.data?.data.status).toBe(newStatus);
    });

    test('상태 업데이트 실패 시 에러를 처리한다', async () => {
      const errorResponse = {
        response: {
          data: { message: 'Invalid status transition' }
        }
      };
      
      vi.mocked(EcommerceApi.updateOrderStatus).mockRejectedValue(errorResponse);

      const { result } = renderHook(
        () => useUpdateOrderStatus(), 
        { wrapper: createTestWrapper() }
      );

      result.current.mutate({ orderId: 'order_123', status: 'invalid' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(errorResponse);
    });

    test('여러 상태 업데이트 시퀀스가 올바르게 작동한다', async () => {
      const orderId = 'order_123';
      
      // 첫 번째 상태 변경: pending → processing
      const firstResponse = {
        success: true,
        data: createMockOrder({ id: orderId, status: 'processing' }),
      };
      
      vi.mocked(EcommerceApi.updateOrderStatus).mockResolvedValueOnce(firstResponse);

      const { result } = renderHook(
        () => useUpdateOrderStatus(), 
        { wrapper: createTestWrapper() }
      );

      // 첫 번째 상태 변경
      result.current.mutate({ orderId, status: 'processing' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data.status).toBe('processing');

      // 두 번째 상태 변경: processing → completed
      const secondResponse = {
        success: true,
        data: createMockOrder({ id: orderId, status: 'completed' }),
      };
      
      vi.mocked(EcommerceApi.updateOrderStatus).mockResolvedValueOnce(secondResponse);

      result.current.mutate({ orderId, status: 'completed' });

      await waitFor(() => {
        expect(result.current.data?.data.status).toBe('completed');
      });

      expect(EcommerceApi.updateOrderStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('useRefundOrder (주문 환불)', () => {
    test('주문을 성공적으로 환불한다', async () => {
      const refundData = {
        orderId: 'order_123',
        amount: 5000,
        reason: 'Customer request',
      };

      const mockResponse = {
        success: true,
        data: { 
          refundId: 'refund_123',
          orderId: 'order_123',
          amount: 5000,
          status: 'completed'
        },
      };

      vi.mocked(EcommerceApi.refundOrder).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useRefundOrder(), 
        { wrapper: createTestWrapper() }
      );

      result.current.mutate(refundData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EcommerceApi.refundOrder).toHaveBeenCalledWith(
        'order_123', 
        5000, 
        'Customer request', 
        undefined
      );
      expect(result.current.data?.data.refundId).toBe('refund_123');
    });

    test('환불 실패 시 에러를 처리한다', async () => {
      const errorResponse = {
        response: {
          data: { message: 'Refund already processed' }
        }
      };
      
      vi.mocked(EcommerceApi.refundOrder).mockRejectedValue(errorResponse);

      const { result } = renderHook(
        () => useRefundOrder(), 
        { wrapper: createTestWrapper() }
      );

      const refundData = {
        orderId: 'order_123',
        amount: 5000,
        reason: 'Duplicate refund',
      };

      result.current.mutate(refundData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(errorResponse);
    });
  });

  describe('useBulkOrderAction (대량 작업)', () => {
    test('대량 상태 업데이트를 성공적으로 처리한다', async () => {
      const bulkAction = {
        action: 'update_status' as const,
        orderIds: ['order_1', 'order_2', 'order_3'],
        data: {
          status: 'completed',
          note: 'Bulk update'
        }
      };

      const mockResponse = {
        success: true,
        data: { updatedCount: 3 },
      };

      vi.mocked(EcommerceApi.bulkOrderAction).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useBulkOrderAction(), 
        { wrapper: createTestWrapper() }
      );

      result.current.mutate(bulkAction);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EcommerceApi.bulkOrderAction).toHaveBeenCalledWith(bulkAction);
      expect(result.current.data?.data.updatedCount).toBe(3);
    });

    test('대량 삭제를 성공적으로 처리한다', async () => {
      const deleteAction = {
        action: 'delete' as const,
        orderIds: ['order_1', 'order_2'],
      };

      const mockResponse = {
        success: true,
        data: { deletedCount: 2 },
      };

      vi.mocked(EcommerceApi.bulkOrderAction).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useBulkOrderAction(), 
        { wrapper: createTestWrapper() }
      );

      result.current.mutate(deleteAction);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EcommerceApi.bulkOrderAction).toHaveBeenCalledWith(deleteAction);
      expect(result.current.data?.data.deletedCount).toBe(2);
    });
  });

  describe('캐싱 및 무효화 테스트', () => {
    test('주문 목록 캐시가 올바르게 작동한다', async () => {
      const mockOrders = [createMockOrder({ id: 'order_1' })];
      const mockResponse = {
        data: mockOrders,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      vi.mocked(EcommerceApi.getOrders).mockResolvedValue(mockResponse);

      // 같은 QueryClient 인스턴스를 공유하는 wrapper 생성
      const SharedWrapper = createTestWrapper();
      
      const { result: result1 } = renderHook(
        () => useOrders(1, 20), 
        { wrapper: SharedWrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // 같은 wrapper로 두 번째 훅 렌더링 - 캐시에서 가져와야 함
      const { result: result2 } = renderHook(
        () => useOrders(1, 20), 
        { wrapper: SharedWrapper }
      );

      // 캐시된 데이터 즉시 사용 가능
      expect(result2.current.data).toEqual(mockResponse);
      
      // API는 캐시 때문에 한 번만 호출됨
      expect(EcommerceApi.getOrders).toHaveBeenCalledTimes(1);
    });
  });

  describe('에러 바운더리 및 리트라이 테스트', () => {
    test('네트워크 에러 시 적절한 에러 메시지를 반환한다', async () => {
      const networkError = new Error('Network connection failed');
      networkError.name = 'NetworkError';
      
      vi.mocked(EcommerceApi.getOrders).mockRejectedValue(networkError);

      const { result } = renderHook(
        () => useOrders(), 
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(networkError);
      expect(result.current.error?.name).toBe('NetworkError');
    });
  });
});