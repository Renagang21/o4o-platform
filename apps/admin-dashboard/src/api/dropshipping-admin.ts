/**
 * Dropshipping Admin API Client
 *
 * DS-4 Order Relay & Settlement Admin API
 *
 * API 경로: /api/v1/dropshipping/admin/*
 */

import { authClient } from '@o4o/auth-client';

const api = authClient.api;

// ==================== Types ====================

export type OrderRelayStatus =
  | 'pending'
  | 'relayed'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type SettlementBatchStatus =
  | 'open'
  | 'closed'
  | 'processing'
  | 'paid'
  | 'failed';

export type SettlementType = 'seller' | 'supplier' | 'platform-extension';

export interface OrderRelay {
  id: string;
  ecommerceOrderId?: string;
  listingId: string;
  externalOrderId?: string;
  orderNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderRelayStatus;
  shippingInfo?: Record<string, any>;
  customerInfo?: Record<string, any>;
  relayedAt?: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  listing?: {
    id: string;
    name?: string;
    seller?: {
      id: string;
      name?: string;
    };
    offer?: {
      id: string;
      supplierId?: string;
    };
  };
}

export interface OrderRelayLog {
  id: string;
  orderRelayId: string;
  action: string;
  previousStatus?: OrderRelayStatus;
  newStatus?: OrderRelayStatus;
  actor: string;
  actorType: string;
  reason?: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SettlementBatch {
  id: string;
  settlementType: SettlementType;
  sellerId?: string;
  supplierId?: string;
  batchNumber: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  commissionAmount: number;
  deductionAmount: number;
  netAmount: number;
  status: SettlementBatchStatus;
  closedAt?: string;
  paidAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementLog {
  id: string;
  settlementBatchId: string;
  action: string;
  previousStatus?: SettlementBatchStatus;
  newStatus?: SettlementBatchStatus;
  actor: string;
  actorType: string;
  reason?: string;
  calculationDetails?: {
    totalAmount: number;
    commissionAmount: number;
    deductionAmount: number;
    netAmount: number;
    transactionCount: number;
    calculatedAt: string;
  };
  adjustmentDetails?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
}

export interface ListResponse<T> {
  success: boolean;
  data: T[];
}

// ==================== Order Relay API ====================

export interface OrderRelayFilters {
  status?: OrderRelayStatus;
  listingId?: string;
  sellerId?: string;
  ecommerceOrderId?: string;
  page?: number;
  limit?: number;
}

export async function getOrderRelays(
  filters: OrderRelayFilters = {}
): Promise<PaginatedResponse<OrderRelay>> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.listingId) params.set('listingId', filters.listingId);
  if (filters.sellerId) params.set('sellerId', filters.sellerId);
  if (filters.ecommerceOrderId) params.set('ecommerceOrderId', filters.ecommerceOrderId);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const queryString = params.toString();
  const url = `/api/v1/dropshipping/admin/order-relays${queryString ? `?${queryString}` : ''}`;

  const response = await api.get<PaginatedResponse<OrderRelay>>(url);
  return response.data;
}

export async function getOrderRelay(id: string): Promise<SingleResponse<OrderRelay>> {
  const response = await api.get<SingleResponse<OrderRelay>>(
    `/api/v1/dropshipping/admin/order-relays/${id}`
  );
  return response.data;
}

export async function updateOrderRelayStatus(
  id: string,
  status: OrderRelayStatus,
  reason: string,
  shippingInfo?: Record<string, any>
): Promise<SingleResponse<OrderRelay>> {
  const response = await api.patch<SingleResponse<OrderRelay>>(
    `/api/v1/dropshipping/admin/order-relays/${id}/status`,
    { status, reason, shippingInfo }
  );
  return response.data;
}

export async function getOrderRelayLogs(id: string): Promise<ListResponse<OrderRelayLog>> {
  const response = await api.get<ListResponse<OrderRelayLog>>(
    `/api/v1/dropshipping/admin/order-relays/${id}/logs`
  );
  return response.data;
}

// ==================== Settlement API ====================

export interface SettlementFilters {
  status?: SettlementBatchStatus;
  settlementType?: SettlementType;
  sellerId?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}

export async function getSettlementBatches(
  filters: SettlementFilters = {}
): Promise<PaginatedResponse<SettlementBatch>> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.settlementType) params.set('settlementType', filters.settlementType);
  if (filters.sellerId) params.set('sellerId', filters.sellerId);
  if (filters.supplierId) params.set('supplierId', filters.supplierId);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const queryString = params.toString();
  const url = `/api/v1/dropshipping/admin/settlements/batches${queryString ? `?${queryString}` : ''}`;

  const response = await api.get<PaginatedResponse<SettlementBatch>>(url);
  return response.data;
}

export async function getSettlementBatch(id: string): Promise<SingleResponse<SettlementBatch>> {
  const response = await api.get<SingleResponse<SettlementBatch>>(
    `/api/v1/dropshipping/admin/settlements/batches/${id}`
  );
  return response.data;
}

export async function getSettlementBatchLogs(id: string): Promise<ListResponse<SettlementLog>> {
  const response = await api.get<ListResponse<SettlementLog>>(
    `/api/v1/dropshipping/admin/settlements/batches/${id}/logs`
  );
  return response.data;
}

export async function calculateSettlement(id: string): Promise<SingleResponse<SettlementBatch>> {
  const response = await api.post<SingleResponse<SettlementBatch>>(
    `/api/v1/dropshipping/admin/settlements/batches/${id}/calculate`
  );
  return response.data;
}

export async function confirmSettlement(id: string): Promise<SingleResponse<SettlementBatch>> {
  const response = await api.post<SingleResponse<SettlementBatch>>(
    `/api/v1/dropshipping/admin/settlements/batches/${id}/confirm`
  );
  return response.data;
}

export async function startProcessingSettlement(id: string): Promise<SingleResponse<SettlementBatch>> {
  const response = await api.post<SingleResponse<SettlementBatch>>(
    `/api/v1/dropshipping/admin/settlements/batches/${id}/start-processing`
  );
  return response.data;
}

export async function markSettlementAsPaid(id: string): Promise<SingleResponse<SettlementBatch>> {
  const response = await api.post<SingleResponse<SettlementBatch>>(
    `/api/v1/dropshipping/admin/settlements/batches/${id}/mark-paid`
  );
  return response.data;
}

export async function markSettlementAsFailed(
  id: string,
  reason: string
): Promise<SingleResponse<SettlementBatch>> {
  const response = await api.post<SingleResponse<SettlementBatch>>(
    `/api/v1/dropshipping/admin/settlements/batches/${id}/mark-failed`,
    { reason }
  );
  return response.data;
}

export async function retrySettlement(id: string): Promise<SingleResponse<SettlementBatch>> {
  const response = await api.post<SingleResponse<SettlementBatch>>(
    `/api/v1/dropshipping/admin/settlements/batches/${id}/retry`
  );
  return response.data;
}

// ==================== State Transition Helpers ====================

/**
 * OrderRelay 허용 상태 전이 (DS-4.3 화이트리스트)
 */
export const ORDER_RELAY_TRANSITIONS: Record<OrderRelayStatus, OrderRelayStatus[]> = {
  pending: ['relayed', 'cancelled'],
  relayed: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

/**
 * SettlementBatch 허용 상태 전이 (DS-4.3 화이트리스트)
 */
export const SETTLEMENT_TRANSITIONS: Record<SettlementBatchStatus, SettlementBatchStatus[]> = {
  open: ['closed'],
  closed: ['processing'],
  processing: ['paid', 'failed'],
  paid: [],
  failed: ['processing'],
};

export function getOrderRelayAllowedTransitions(currentStatus: OrderRelayStatus): OrderRelayStatus[] {
  return ORDER_RELAY_TRANSITIONS[currentStatus] || [];
}

export function getSettlementAllowedTransitions(currentStatus: SettlementBatchStatus): SettlementBatchStatus[] {
  return SETTLEMENT_TRANSITIONS[currentStatus] || [];
}

// ==================== Status Labels ====================

export const ORDER_RELAY_STATUS_LABELS: Record<OrderRelayStatus, string> = {
  pending: '대기중',
  relayed: '전달됨',
  confirmed: '확인됨',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '취소됨',
  refunded: '환불됨',
};

export const SETTLEMENT_STATUS_LABELS: Record<SettlementBatchStatus, string> = {
  open: '진행중',
  closed: '마감',
  processing: '처리중',
  paid: '지급완료',
  failed: '실패',
};

export const ORDER_RELAY_STATUS_COLORS: Record<OrderRelayStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  pending: 'gray',
  relayed: 'blue',
  confirmed: 'blue',
  shipped: 'yellow',
  delivered: 'green',
  cancelled: 'red',
  refunded: 'red',
};

export const SETTLEMENT_STATUS_COLORS: Record<SettlementBatchStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  open: 'gray',
  closed: 'blue',
  processing: 'yellow',
  paid: 'green',
  failed: 'red',
};
