/**
 * Pharmacy-Hub 장바구니 · 주문 · 결제 API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1
 *
 * 계약 (backend: WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1):
 *   장바구니 → 주문 생성(공급자별 N건 + paymentGroupId) → prepare → Toss → confirm
 *
 * ⚠️ 금액 규칙: **모든 금액은 서버 응답을 그대로 표시한다.**
 *   프론트에서 소계·배송비·총액을 다시 계산하지 않으며, 계산값을 결제 승인에 쓰지 않는다.
 *   결제 금액의 권위는 서버의 주문 원장이다(prepare 가 원장 합계로 세션을 만든다).
 */
import { api } from '../apiClient';

const BASE = '/pharmacy-hub/store-owner';

/** 서버 응답 껍데기를 벗기고 실패를 예외로 바꾼다. */
function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || body?.error?.message || fallbackMessage);
  }
  return body.data as T;
}

// ── 매장 홈 요약 (WO-PHARMACY-HUB-STORE-HOME-DASHBOARD-V1) ──────────────────

/**
 * 매장 조직 해석 결과.
 *   connected     : Pharmacy-Hub active enrollment 조직이 정확히 1개
 *   not_connected : 0개 — "매장 정보 미연결" 정상 빈 상태 (다른 서비스 조직으로 대체하지 않는다)
 *   ambiguous     : 2개 이상 — 임의 선택 없이 안내만 한다
 */
export interface DashboardStore {
  status: 'connected' | 'not_connected' | 'ambiguous';
  organizationId: string | null;
  name: string | null;
  code: string | null;
  slug: string | null;
  candidateCount: number;
  errorCode?: 'AMBIGUOUS_STORE_CONNECTION';
}

export interface DashboardMembership {
  status: string;
  role: string | null;
  roleType: string | null;
  approvedAt: string | null;
  appliedAt: string | null;
}

export interface DashboardRecentOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  /** 판정 근거는 주문 목록(GET /orders)과 동일하다 — 홈과 목록의 배지가 갈리지 않게 한다. */
  supplierNotified: boolean;
}

export interface StoreDashboard {
  store: DashboardStore;
  membership: DashboardMembership;
  cart: { itemCount: number; totalQuantity: number };
  orders: {
    total: number;
    awaitingPayment: number;
    inFulfillment: number;
    cancelled: number;
    recent: DashboardRecentOrder[];
    recentLimit: number;
  };
}

export async function fetchStoreDashboard(): Promise<StoreDashboard> {
  const res = await api.get(`${BASE}/dashboard`);
  return unwrap<StoreDashboard>(res.data, '매장 요약 정보를 불러오지 못했습니다.');
}

// ── 장바구니 ────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  supplierId: string | null;
  supplierProductOfferId: string | null;
  productName: string;
  quantity: number;
  priceSnapshot: number;
}

export interface CartGroupShipping {
  shippingFee: number;
  freeShippingApplied: boolean;
  freeShippingThreshold: number | null;
  remainingForFreeShipping: number | null;
  policyConfigured: boolean;
}

export interface CartGroup {
  supplierId: string | null;
  supplierName: string;
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  displaySubtotal: number;
  shipping: CartGroupShipping;
  displayTotal: number;
}

export interface CartResponse {
  items: CartItem[];
  groups: CartGroup[];
  totalItems: number;
  totalQuantity: number;
  displaySubtotal: number;
  displayShippingFee: number;
  displayTotal: number;
}

export async function fetchCart(): Promise<CartResponse> {
  const res = await api.get(`${BASE}/cart`);
  return unwrap<CartResponse>(res.data, '장바구니를 불러오지 못했습니다.');
}

export async function addCartItem(offerId: string, quantity = 1): Promise<void> {
  const res = await api.post(`${BASE}/cart/items`, { offerId, quantity });
  unwrap(res.data, '장바구니에 담지 못했습니다.');
}

export async function updateCartItem(itemId: string, quantity: number): Promise<void> {
  const res = await api.patch(`${BASE}/cart/items/${itemId}`, { quantity });
  unwrap(res.data, '수량을 변경하지 못했습니다.');
}

export async function removeCartItem(itemId: string): Promise<void> {
  const res = await api.delete(`${BASE}/cart/items/${itemId}`);
  unwrap(res.data, '항목을 삭제하지 못했습니다.');
}

// ── 주문 ────────────────────────────────────────────────────────────────────

export interface CreatedOrder {
  orderId: string;
  orderNumber: string;
  supplierId: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
}

export interface FailedItem {
  itemId: string;
  productName: string;
  code: string;
  reason: string;
}

export interface CreateOrderResult {
  paymentGroupId: string;
  orders: CreatedOrder[];
  failedItems: FailedItem[];
  supplierNotified: boolean;
  requiresPayment: boolean;
  notice: string;
}

export async function createOrders(note?: string): Promise<CreateOrderResult> {
  const res = await api.post(`${BASE}/orders`, note ? { note } : {});
  return unwrap<CreateOrderResult>(res.data, '주문 생성에 실패했습니다.');
}

export interface OrderListItem {
  orderId: string;
  orderNumber: string;
  supplierId: string | null;
  status: string;
  paymentStatus: string;
  paymentGroupId: string | null;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  itemCount: number;
  createdAt: string;
  supplierNotified: boolean;
  notice: string;
}

export interface OrderListResult {
  items: OrderListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function fetchOrders(page = 1, limit = 20): Promise<OrderListResult> {
  const res = await api.get(`${BASE}/orders`, { params: { page, limit } });
  return unwrap<OrderListResult>(res.data, '주문 목록을 불러오지 못했습니다.');
}

export interface OrderDetail {
  orderId: string;
  orderNumber: string;
  supplierId: string | null;
  supplierName: string;
  status: string;
  paymentStatus: string;
  paidAt: string | null;
  paymentGroupId: string | null;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number; subtotal: number }>;
  note: string | null;
  createdAt: string;
  /** 공급자 원장(neture_orders) 상태 — null 이면 아직 전달되지 않았다 */
  fulfillmentStatus: string | null;
  supplierNotified: boolean;
  notice: string;
}

export async function fetchOrderDetail(orderId: string): Promise<OrderDetail> {
  const res = await api.get(`${BASE}/orders/${orderId}`);
  return unwrap<OrderDetail>(res.data, '주문을 불러오지 못했습니다.');
}

/** 결제 전 단건 취소. 결제된 주문은 서버가 409(ALREADY_PAID)로 거부한다. */
export async function cancelOrderBeforePayment(orderId: string, reason?: string): Promise<void> {
  const res = await api.post(`${BASE}/orders/${orderId}/cancel`, reason ? { reason } : {});
  unwrap(res.data, '주문을 취소하지 못했습니다.');
}

// ── 결제 ────────────────────────────────────────────────────────────────────

export interface PreparePaymentResult {
  paymentId: string;
  transactionId?: string;
  paymentGroupId: string;
  orderCount: number;
  /** 결제할 금액 — 서버 원장 합계. 프론트가 만든 값이 아니다. */
  amount: number;
  clientKey?: string;
  isTestMode?: boolean;
}

export async function preparePayment(params: {
  paymentGroupId: string;
  successUrl: string;
  failUrl: string;
}): Promise<PreparePaymentResult> {
  const res = await api.post(`${BASE}/payments/prepare`, params);
  return unwrap<PreparePaymentResult>(res.data, '결제 준비에 실패했습니다.');
}

export interface ConfirmPaymentResult {
  paymentId: string;
  paymentGroupId: string;
  status: string;
  paidAmount?: number;
  paymentMethod?: string;
  paidAt?: string;
}

export async function confirmPayment(params: {
  paymentId: string;
  paymentKey: string;
  paymentGroupId: string;
}): Promise<ConfirmPaymentResult> {
  const res = await api.post(`${BASE}/payments/confirm`, params);
  return unwrap<ConfirmPaymentResult>(res.data, '결제 승인에 실패했습니다.');
}

/**
 * Toss v1 결제 SDK 로더 — CDN 스크립트 주입.
 * npm 의존성을 추가하지 않아 lockfile 이 변하지 않는다(Neture 와 동일 방식).
 */
export async function loadTossWidget(clientKey: string): Promise<any> {
  const w = window as any;
  if (!w.TossPayments) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-toss-sdk="v1"]',
      ) as HTMLScriptElement | null;
      if (existing) {
        if (w.TossPayments) return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('결제 모듈을 불러오지 못했습니다.')));
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://js.tosspayments.com/v1/payment';
      s.async = true;
      s.dataset.tossSdk = 'v1';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('결제 모듈을 불러오지 못했습니다.'));
      document.head.appendChild(s);
    });
  }
  if (!w.TossPayments) throw new Error('결제 모듈을 사용할 수 없습니다.');
  return w.TossPayments(clientKey);
}

/** axios 오류에서 서버 메시지를 꺼낸다 (없으면 기본 문구). */
export function errorMessage(err: unknown, fallback: string): string {
  const res = (err as { response?: { data?: { error?: string; code?: string } } }).response;
  if (res?.data?.error) return res.data.error;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** axios 오류의 HTTP 상태 */
export function errorStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } }).response?.status;
}
