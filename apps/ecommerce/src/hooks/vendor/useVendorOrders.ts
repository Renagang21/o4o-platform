import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorOrderApi } from '../../api/vendor';
import { toast } from 'sonner';

interface OrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// 주문 목록 조회
export function useVendorOrders(params: OrdersParams = {}) {
  return useQuery({
    queryKey: ['vendor', 'orders', params],
    queryFn: async () => {
      const response = await vendorOrderApi.getOrders(params);
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2분
  });
}

// 주문 상세 조회
export function useVendorOrder(id: string) {
  return useQuery({
    queryKey: ['vendor', 'orders', id],
    queryFn: async () => {
      const response = await vendorOrderApi.getOrder(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// 주문 통계 조회
export function useVendorOrderStats() {
  return useQuery({
    queryKey: ['vendor', 'order-stats'],
    queryFn: async () => {
      const response = await vendorOrderApi.getOrderStats();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// 주문 상태 업데이트
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { 
      id: string; 
      data: {
        status?: string;
        trackingNumber?: string;
        carrier?: string;
      }
    }) => vendorOrderApi.updateOrderStatus(id, data) as Promise<any>,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'orders', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'order-stats'] });
      toast.success('주문 상태가 업데이트되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '주문 상태 업데이트에 실패했습니다.');
    },
  });
}

// 대량 주문 상태 업데이트
export function useBulkUpdateOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderIds, status }: { orderIds: string[]; status: string }) => 
      vendorOrderApi.bulkUpdateOrders(orderIds, status) as Promise<any>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'order-stats'] });
      toast.success('선택한 주문들의 상태가 업데이트되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '주문 상태 업데이트에 실패했습니다.');
    },
  });
}