import { authClient } from '@o4o/auth-client';
import { Order, OrderFilters, OrdersResponse, EcommerceApiResponse } from '@o4o/types';

export interface CreateOrderData {
  items?: Array<{
    productId: string;
    quantity: number;
    price?: number;
  }>;
  shippingAddress: {
    recipientName: string;
    recipientPhone: string;
    postalCode: string;
    address: string;
    addressDetail?: string;
  };
  paymentMethod: string;
  deliveryRequest?: string;
  couponCode?: string;
}

export const ordersApi = {
  // Get user's orders
  getOrders: async (filters?: OrderFilters): Promise<OrdersResponse> => {
    const response = await authClient.api.get<OrdersResponse>('/orders', {
      params: filters
    });
    return response.data;
  },

  // Get single order
  getOrder: async (id: string): Promise<Order> => {
    const response = await authClient.api.get<Order>(`/orders/${id}`);
    return response.data;
  },

  // Create new order
  createOrder: async (data: CreateOrderData): Promise<Order> => {
    const response = await authClient.api.post<Order>('/orders', data);
    return response.data;
  },

  // Create order from cart
  createOrderFromCart: async (data: Omit<CreateOrderData, 'items'>): Promise<Order> => {
    const response = await authClient.api.post<Order>('/orders/from-cart', data);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (id: string, reason?: string): Promise<EcommerceApiResponse<Order>> => {
    const response = await authClient.api.post<EcommerceApiResponse<Order>>(`/orders/${id}/cancel`, {
      reason
    });
    return response.data;
  },

  // Request refund
  requestRefund: async (id: string, data: {
    reason: string;
    items?: string[]; // Item IDs for partial refund
  }): Promise<EcommerceApiResponse<Order>> => {
    const response = await authClient.api.post<EcommerceApiResponse<Order>>(`/orders/${id}/refund`, data);
    return response.data;
  },

  // Track order
  trackOrder: async (id: string): Promise<{
    trackingNumber: string;
    carrier: string;
    status: string;
    history: Array<{
      status: string;
      location: string;
      timestamp: string;
    }>;
  }> => {
    const response = await authClient.api.get(`/orders/${id}/tracking`);
    return response.data;
  },

  // Reorder
  reorder: async (orderId: string): Promise<EcommerceApiResponse<Order>> => {
    const response = await authClient.api.post<EcommerceApiResponse<Order>>(`/orders/${orderId}/reorder`);
    return response.data;
  },

  // Download invoice
  downloadInvoice: async (orderId: string): Promise<Blob> => {
    const response = await authClient.api.get(`/orders/${orderId}/invoice`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get order statistics
  getOrderStats: async (): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    recentOrders: Order[];
  }> => {
    const response = await authClient.api.get('/orders/stats');
    return response.data;
  }
};