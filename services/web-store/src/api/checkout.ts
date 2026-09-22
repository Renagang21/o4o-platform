/**
 * Checkout & Order API Client — **buyer(구매/발주) 축 전용**
 *
 * WO-STORE-B2B-ORDER-EXECUTION-FLOW-V1
 * WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1:
 *   판매자(seller) 축 및 주문 생성 producer 제거.
 *
 * GET  /checkout/orders             — 내 매장 구매/발주 목록 (buyerId)
 * GET  /checkout/orders/:id         — 상세
 * POST /checkout/orders/:id/cancel  — 결제 전 취소
 */

import { apiClient } from './client';

// ── API Functions ──
//
// WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1:
//   아래 함수들을 제거했다. 대응 백엔드 경로가 은퇴했기 때문이다.
//     · createOrder()            → `POST /kpa/checkout` (410, 소비자→매장 주문 생성 producer)
//     · getStoreOrders()         ┐
//     · getStoreOrderKpi()       │ `GET|PATCH /kpa/checkout/store-orders*` (제거)
//     · getStoreOrderDetail()    │  sellerOrganizationId 축 = 매장이 판매자인 관점
//     · updateStoreOrderStatus() ┘
//   근거: `O4O-STORE-COMMERCE-BOUNDARY-V1` §2-1 · §2-2 · §3 · §7.
//   보존: 아래 buyer(구매/발주) 축 — 매장이 **구매자**인 B2B 는 현행 canonical 이다.

// ── Buyer 구매/발주 내역 (checkout_orders, buyerId 기준) ──
// IR-O4O-STORE-ORDER-DIRECTION-SEMANTICS-CROSSSERVICE-V1: "내 매장 주문 내역" canonical = buyer.

export interface BuyerOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  organization?: { id?: string; name?: string };
  itemCount: number;
  createdAt: string;
}

/** 내 매장 구매/발주 내역 — checkout_orders(buyerId + serviceKey) */
export async function getBuyerOrders(params?: {
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: BuyerOrder[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  return apiClient.get('/checkout/orders', params);
}

/** buyer 주문 상세 — GET /kpa/checkout/orders/:orderId (buyerId 스코프) */
export interface BuyerOrderDetail extends BuyerOrder {
  subtotal: number;
  shippingFee: number;
  discount: number;
  deliveryMethod?: string | null;
  shippingAddress?: Record<string, unknown> | null;
  items?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  paidAt?: string | null;
  updatedAt?: string;
}

export async function getBuyerOrderDetail(orderId: string): Promise<{
  success: boolean;
  data: BuyerOrderDetail;
}> {
  return apiClient.get(`/checkout/orders/${orderId}`);
}

/**
 * 결제 전 주문 취소 — POST /kpa/checkout/orders/:orderId/cancel
 * WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1 계약.
 * 이미 취소된 주문은 멱등 성공(alreadyCancelled=true).
 */
export async function cancelBuyerOrder(
  orderId: string,
  reason?: string,
): Promise<{
  success: boolean;
  data: {
    ok: boolean;
    orderId: string;
    status: string;
    alreadyCancelled: boolean;
    releasedListings: Array<{ listingId: string; quantity: number }>;
  };
}> {
  return apiClient.post(`/checkout/orders/${orderId}/cancel`, { reason });
}
