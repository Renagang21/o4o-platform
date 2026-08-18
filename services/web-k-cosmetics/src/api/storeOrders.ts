/**
 * Store Orders API Client — K-Cosmetics
 *
 * WO-O4O-KCOSMETICS-STORE-ORDERS-FRONTEND-ALIGNMENT-V1
 *
 * Backend: /api/v1/cosmetics/orders
 * K-Cosmetics 사용자-facing 문구는 "내 매장", "매장 주문" 기준
 * ⚠️ "내 약국" 또는 약국 전용 문구 사용 금지
 */

import { api } from '../lib/apiClient';

export type OrderStatus = 'created' | 'pending_payment' | 'paid' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed';
export type OrderChannel = 'local' | 'travel';

export interface StoreOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  channel: OrderChannel;
  storeName?: string;
  itemCount: number;
  createdAt: string;
}

export interface StoreOrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  currency: 'KRW';
  channel: OrderChannel;
  fulfillment?: 'pickup' | 'delivery' | 'on-site';
  store?: { id: string; name?: string };
  shippingAddress?: Record<string, unknown>;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
  }>;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  channel?: OrderChannel;
}

export interface StoreOrdersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StoreOrdersResponse {
  success: boolean;
  data: StoreOrder[];
  pagination: StoreOrdersPagination;
}

export async function getStoreOrders(
  params?: StoreOrdersParams,
): Promise<StoreOrdersResponse> {
  const res = await api.get<StoreOrdersResponse>('/cosmetics/orders', { params });
  return res.data;
}

export async function getStoreOrder(
  orderId: string,
): Promise<{ success: boolean; data: StoreOrderDetail }> {
  const res = await api.get<{ success: boolean; data: StoreOrderDetail }>(
    `/cosmetics/orders/${orderId}`,
  );
  return res.data;
}

/**
 * 결제 전 주문 취소 — WO-O4O-STORE-HUB-MAIN-INDEPENDENT-PRODUCTION-VERIFICATION-V1 §9
 * 백엔드 `POST /cosmetics/orders/:id/cancel` (3서비스 공통 cancelStoreOrderBeforePayment).
 * created / pending_payment 만 취소 가능하며, 이미 취소된 주문은 멱등 성공이다.
 */
export interface StoreOrderCancelResult {
  ok?: boolean;
  orderId: string;
  status: string;
  alreadyCancelled: boolean;
  releasedListings?: Array<{ listingId: string; quantity: number }>;
}

export async function cancelStoreOrder(
  orderId: string,
  reason?: string,
): Promise<{ success: boolean; data: StoreOrderCancelResult }> {
  const res = await api.post<{ success: boolean; data: StoreOrderCancelResult }>(
    `/cosmetics/orders/${orderId}/cancel`,
    { reason },
  );
  return res.data;
}
