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

export interface StoreOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  buyerName: string;
  buyerEmail: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  metadata: {
    serviceKey: string;
    channelType: string;
    deliveryMethod: string;
    organizationName: string;
  };
  shippingAddress: {
    recipientName: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    memo?: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    method: string | null;
    cardCompany: string | null;
    approvedAt: string | null;
    refundedAmount: number;
    refundReason: string | null;
    refundedAt: string | null;
    createdAt: string;
  }>;
  logs: Array<{
    id: string;
    action: string;
    previousStatus: string | null;
    newStatus: string | null;
    performedBy: string;
    performerType: string;
    message: string | null;
    createdAt: string;
  }>;
  paidAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export async function getStoreOrderDetail(orderId: string): Promise<{
  success: boolean;
  data: StoreOrderDetail;
}> {
  return apiClient.get(`/checkout/store-orders/${orderId}`);
}

export async function updateStoreOrderStatus(
  orderId: string,
  body: { action: 'cancel' | 'refund'; reason: string },
): Promise<{ success: boolean; data: any }> {
  return apiClient.patch(`/checkout/store-orders/${orderId}/status`, body);
}
