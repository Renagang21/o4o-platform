import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Order, OrderFilters, OrdersResponse } from '@o4o/types/ecommerce';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

// Fetch orders
export const useOrders = (filters?: OrderFilters) => {
  return useQuery<OrdersResponse>({
    queryKey: ['orders', filters],
    queryFn: () => api.orders.getOrders(filters)
  });
};

// Fetch single order
export const useOrder = (id: string) => {
  return useQuery<Order>({
    queryKey: ['order', id],
    queryFn: () => api.orders.getOrder(id),
    enabled: !!id
  });
};

// Create order from cart
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: api.orders.createOrderFromCart,
    onSuccess: (order) => {
      // Clear cart
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Navigate to order confirmation
      navigate(`/orders/${order.id}`);
    }
  });
};

// Cancel order
export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      return api.orders.cancelOrder(orderId, reason);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
};

// Request refund
export const useRequestRefund = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, ...data }: { orderId: string; reason: string; items?: string[] }) => {
      return api.orders.requestRefund(orderId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
};

// Track order
export const useTrackOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order-tracking', orderId],
    queryFn: () => api.orders.trackOrder(orderId),
    enabled: !!orderId
  });
};

// Reorder
export const useReorder = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: api.orders.reorder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      navigate('/cart');
    }
  });
};

// Download invoice
export const useDownloadInvoice = () => {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const blob = await api.orders.downloadInvoice(orderId);
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  });
};

// Get order statistics
export const useOrderStats = () => {
  return useQuery({
    queryKey: ['order-stats'],
    queryFn: api.orders.getOrderStats
  });
};