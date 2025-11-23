/**
 * Order Service
 * R-6-9: Customer Order Viewing
 *
 * Provides API integration for customer order list and detail
 */

import { authClient } from '@o4o/auth-client';

// ===========================
// Types
// ===========================

export interface OrderListQuery {
  page?: number;
  limit?: number;
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'all';
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  sortBy?: 'createdAt' | 'totalAmount';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  totalAmount: number;
  currency: string;
  itemCount: number;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  isCancellable: boolean;
  isReturnable: boolean;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  buyer: {
    id: string;
    name: string;
    email: string;
  };
  shippingAddress: {
    recipientName: string;
    phone: string;
    email?: string;
    zipCode: string;
    address: string;
    detailAddress: string;
    city: string;
    country: string;
    deliveryRequest?: string;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    productImage: string;
    productBrand?: string;
    variationName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sellerId: string;
    sellerName: string;
  }>;
  summary: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
  };
  currency: string;
  paymentMethod?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentProvider?: string;
  paidAt?: string;
  shippingMethod?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  statusTimeline: Array<{
    status: string;
    timestamp: string;
    label: string;
  }>;
  customerNotes?: string;
  cancellationReason?: string;
  returnReason?: string;
  refundAmount?: number;
  refundDate?: string;
  isCancellable: boolean;
  isReturnable: boolean;
}

export interface OrderListResponse {
  success: true;
  data: {
    orders: OrderListItem[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

export interface OrderDetailResponse {
  success: true;
  data: OrderDetail;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: any[];
}

// ===========================
// Service
// ===========================

class OrderService {
  /**
   * Get paginated order list
   */
  async getOrders(query: OrderListQuery = {}): Promise<OrderListResponse> {
    try {
      const params = new URLSearchParams();

      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status && query.status !== 'all') params.append('status', query.status);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);

      const queryString = params.toString();
      const url = `/api/v1/customer/orders${queryString ? `?${queryString}` : ''}`;

      const response = await authClient.api.get<OrderListResponse>(url);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get orders:', error);
      throw error;
    }
  }

  /**
   * Get order detail by ID
   */
  async getOrderDetail(orderId: string): Promise<OrderDetailResponse> {
    try {
      const response = await authClient.api.get<OrderDetailResponse>(
        `/api/v1/customer/orders/${orderId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to get order detail:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const orderService = new OrderService();
