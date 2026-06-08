/**
 * K-Cosmetics Operator Orders API Client (view-only)
 *
 * WO-O4O-OPERATOR-ORDER-VIEW-FRONTEND-WIRE-V1
 *
 * canonical 원장 checkout_orders 기반 view-only operator 주문 조회.
 * 선행: WO-O4O-OPERATOR-ORDER-VIEW-API-V1 (backend).
 *
 * Operator:
 *   GET /api/v1/cosmetics/operator/orders
 *
 * 상태변경/배송/취소/환불/송장/정산 없음 (조회 전용). buyer-scope /cosmetics/orders 와 별개.
 */

import { api } from '@/lib/apiClient';

/** PII-safe 목록 항목 (주소/연락처/buyerId/items 상세 미포함) */
export interface CosOperatorOrder {
  id: string;
  orderNumber: string;
  /** checkout_orders.status: created | pending_payment | paid | refunded | cancelled */
  status: string;
  /** checkout_orders.paymentStatus: pending | paid | failed | refunded */
  paymentStatus: string;
  totalAmount: number;
  itemCount: number;
  channel: string | null;
  storeName: string | null;
  /** PII 미노출 — 항상 null */
  buyerLabel: string | null;
  createdAt: string;
}

export interface CosOperatorOrderStats {
  total: number;
  paid: number;
  pending: number;
  cancelled: number;
  totalAmount: number;
}

export interface CosOperatorOrdersResponse {
  success: boolean;
  data: {
    orders: CosOperatorOrder[];
    stats: CosOperatorOrderStats;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export const cosOperatorOrdersApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => api.get<CosOperatorOrdersResponse>('/cosmetics/operator/orders', { params }),
};
