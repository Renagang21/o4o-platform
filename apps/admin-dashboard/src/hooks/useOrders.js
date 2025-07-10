import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { EcommerceApi } from '@/api/ecommerceApi';
const toast = {
    success: (message) => console.log('SUCCESS:', message),
    error: (message) => console.error('ERROR:', message),
};
export const useOrders = (page = 1, limit = 20, filters = {}) => {
    return useQuery({
        queryKey: ['orders', page, limit, filters],
        queryFn: () => EcommerceApi.getOrders(page, limit, filters),
        placeholderData: keepPreviousData,
        staleTime: 2 * 60 * 1000,
    });
};
export const useOrder = (orderId, enabled = true) => {
    return useQuery({
        queryKey: ['order', orderId],
        queryFn: () => EcommerceApi.getOrder(orderId),
        enabled: !!orderId && enabled,
        staleTime: 2 * 60 * 1000,
    });
};
export const useUpdateOrderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ orderId, status, note }) => EcommerceApi.updateOrderStatus(orderId, status, note),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
            toast.success(`주문 상태가 '${variables.status}'로 변경되었습니다.`);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || '주문 상태 변경에 실패했습니다.');
        },
    });
};
export const useRefundOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ orderId, amount, reason, items }) => EcommerceApi.refundOrder(orderId, amount, reason, items),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
            toast.success('주문 환불이 성공적으로 처리되었습니다.');
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || '주문 환불 처리에 실패했습니다.');
        },
    });
};
export const useBulkOrderAction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (action) => EcommerceApi.bulkOrderAction(action),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            if (variables.action === 'update_status') {
                toast.success(`${variables.orderIds.length}개 주문의 상태가 변경되었습니다.`);
            }
            else if (variables.action === 'delete') {
                toast.success(`${variables.orderIds.length}개 주문이 삭제되었습니다.`);
            }
            else if (variables.action === 'export') {
                toast.success('주문 데이터 내보내기가 완료되었습니다.');
            }
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || '대량 작업 처리에 실패했습니다.');
        },
    });
};
//# sourceMappingURL=useOrders.js.map