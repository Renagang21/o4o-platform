/**
 * Checkout & Order API Client
 *
 * WO-STORE-B2B-ORDER-EXECUTION-FLOW-V1
 *
 * POST /checkout                  — 주문 생성 (B2B/B2C 공용)
 * GET  /checkout/store-orders     — 매장 주문 목록 (판매자 관점)
 * GET  /checkout/store-orders/kpi — 매장 주문 KPI
 */

import { apiClient } from './client';

// ── Types ──

export interface CreateOrderItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  organizationId: string;
  items: CreateOrderItem[];
  deliveryMethod?: 'pickup' | 'delivery';
}

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  createdAt: string;
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  buyerId: string;
  itemCount: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  metadata: {
    channelType: string;
    deliveryMethod: string;
    organizationName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StoreOrderKpi {
  total: number;
  pending: number;
  completed: number;
  monthlyRevenue: number;
}

// ── API Functions ──

export async function createOrder(
  request: CreateOrderRequest,
): Promise<{ success: boolean; data: CreateOrderResponse }> {
  return apiClient.post('/checkout', request);
}

export async function getStoreOrders(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: StoreOrder[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  return apiClient.get('/checkout/store-orders', params);
}

export async function getStoreOrderKpi(): Promise<{
  success: boolean;
  data: StoreOrderKpi;
}> {
  return apiClient.get('/checkout/store-orders/kpi');
}
