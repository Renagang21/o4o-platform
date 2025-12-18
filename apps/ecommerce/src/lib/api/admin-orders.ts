/**
 * Admin Orders API
 *
 * Phase N-2: 운영 안정화
 *
 * 운영자용 주문 관리 API
 */

import { authClient } from '@o4o/auth-client';

/**
 * 주문 아이템
 */
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * 배송 주소
 */
export interface ShippingAddress {
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
}

/**
 * 주문 정보
 */
export interface AdminOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  supplierId: string;
  partnerId?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  shippingAddress?: ShippingAddress;
  paidAt?: string;
  refundedAt?: string;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 결제 정보
 */
export interface AdminPayment {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  paymentKey?: string;
  method?: string;
  cardCompany?: string;
  cardNumber?: string;
  installmentMonths?: number;
  approvedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 주문 로그
 */
export interface OrderLog {
  id: string;
  orderId: string;
  action: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  performedBy?: string;
  performerType?: string;
  note?: string;
  createdAt: string;
}

/**
 * 주문 통계
 */
export interface OrderStats {
  counts: {
    paid: number;
    refunded: number;
    pending: number;
    total: number;
  };
  revenue: {
    total: number;
    currency: string;
  };
}

/**
 * 주문 목록 필터
 */
export interface OrderListFilters {
  status?: string;
  paymentStatus?: string;
  supplierId?: string;
  partnerId?: string;
  limit?: number;
  offset?: number;
}

/**
 * 주문 목록 응답
 */
export interface OrderListResponse {
  orders: AdminOrder[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Admin 주문 목록 조회
 */
export async function getAdminOrders(
  filters?: OrderListFilters
): Promise<OrderListResponse> {
  const params = new URLSearchParams();

  if (filters?.status) params.append('status', filters.status);
  if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
  if (filters?.supplierId) params.append('supplierId', filters.supplierId);
  if (filters?.partnerId) params.append('partnerId', filters.partnerId);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const queryString = params.toString();
  const url = queryString ? `/api/admin/orders?${queryString}` : '/api/admin/orders';

  const response = await authClient.api.get<{
    success: boolean;
    data: OrderListResponse;
    message?: string;
  }>(url);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to get orders');
  }

  return response.data.data;
}

/**
 * Admin 주문 상세 조회
 */
export async function getAdminOrder(orderId: string): Promise<{
  order: AdminOrder;
  payment: AdminPayment | null;
}> {
  const response = await authClient.api.get<{
    success: boolean;
    data: {
      order: AdminOrder;
      payment: AdminPayment | null;
    };
    message?: string;
  }>(`/api/admin/orders/${orderId}`);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to get order');
  }

  return response.data.data;
}

/**
 * Admin 주문 환불
 */
export async function refundOrder(
  orderId: string,
  data: { reason: string; amount?: number }
): Promise<{
  order: AdminOrder;
  payment: AdminPayment;
}> {
  const response = await authClient.api.post<{
    success: boolean;
    data: {
      order: AdminOrder;
      payment: AdminPayment;
    };
    message?: string;
  }>(`/api/admin/orders/${orderId}/refund`, data);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Refund failed');
  }

  return response.data.data;
}

/**
 * Admin 주문 로그 조회
 */
export async function getOrderLogs(orderId: string): Promise<OrderLog[]> {
  const response = await authClient.api.get<{
    success: boolean;
    data: OrderLog[];
    message?: string;
  }>(`/api/admin/orders/${orderId}/logs`);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to get order logs');
  }

  return response.data.data;
}

/**
 * Admin 주문 통계 조회
 */
export async function getOrderStats(): Promise<OrderStats> {
  const response = await authClient.api.get<{
    success: boolean;
    data: OrderStats;
    message?: string;
  }>('/api/admin/orders/stats');

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to get order stats');
  }

  return response.data.data;
}
