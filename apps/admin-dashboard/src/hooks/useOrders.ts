import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { EcommerceApi } from '@/api/ecommerceApi';
import { OrderFilters, OrderStatus } from '@/types/ecommerce';
import axios from 'axios';

// 임시 toast 모킹 (react-hot-toast 미설치)
const toast = {
  success: (message: string) => console.log('SUCCESS:', message),
  error: (message: string) => console.error('ERROR:', message),
};

// 주문 목록 조회 훅
export const useOrders = (
  page = 1,
  limit = 20,
  filters: OrderFilters = {}
) => {
  return useQuery({
    queryKey: ['orders', page, limit, filters],
    queryFn: () => EcommerceApi.getOrders(page, limit, filters),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2분 (주문은 더 자주 업데이트)
  });
};

// 단일 주문 조회 훅
export const useOrder = (orderId: string, enabled = true) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => EcommerceApi.getOrder(orderId),
    enabled: !!orderId && enabled,
    staleTime: 2 * 60 * 1000,
  });
};

// 주문 상태 변경 훅
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      orderId, 
      status, 
      note 
    }: { 
      orderId: string; 
      status: string; 
      note?: string;
    }) => EcommerceApi.updateOrderStatus(orderId, status, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      toast.success(`주문 상태가 '${variables.status}'로 변경되었습니다.`);
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || '주문 상태 변경에 실패했습니다.');
      } else {
        toast.error('주문 상태 변경에 실패했습니다.');
      }
    },
  });
};

// 주문 환불 훅
export const useRefundOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      orderId, 
      amount, 
      reason,
      items 
    }: { 
      orderId: string; 
      amount: number; 
      reason?: string;
      items?: Array<{ orderItemId: string; quantity: number; amount: number }>;
    }) => EcommerceApi.refundOrder(orderId, amount, reason, items),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      toast.success('주문 환불이 성공적으로 처리되었습니다.');
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || '주문 환불 처리에 실패했습니다.');
      } else {
        toast.error('주문 환불 처리에 실패했습니다.');
      }
    },
  });
};

// 대량 주문 작업 훅
export const useBulkOrderAction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (action: {
      action: 'update_status' | 'delete' | 'export';
      orderIds: string[];
      data?: {
        status?: OrderStatus;
        note?: string;
      };
    }) => EcommerceApi.bulkOrderAction(action),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      if (variables.action === 'update_status') {
        toast.success(`${variables.orderIds.length}개 주문의 상태가 변경되었습니다.`);
      } else if (variables.action === 'delete') {
        toast.success(`${variables.orderIds.length}개 주문이 삭제되었습니다.`);
      } else if (variables.action === 'export') {
        toast.success('주문 데이터 내보내기가 완료되었습니다.');
      }
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || '대량 작업 처리에 실패했습니다.');
      } else {
        toast.error('대량 작업 처리에 실패했습니다.');
      }
    },
  });
};