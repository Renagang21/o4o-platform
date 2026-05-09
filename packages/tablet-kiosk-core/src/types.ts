/**
 * Tablet Kiosk Core — shared types
 *
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 *
 * KPA / K-Cosmetics 가 동일하게 쓰던 type 정의를 공통 패키지로 추출.
 * `stock_quantity` 만 optional 처리하여 두 서비스 정의를 통합.
 */

export interface TabletProduct {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  images?: Array<{ url: string }>;
  category: string;
  /** Cosmetics 정의에는 필수, KPA 정의에는 부재 — Kiosk UI 자체에서는 미사용 */
  stock_quantity?: number;
  description?: string;
  short_description?: string;
  channel_price?: number;
}

export interface TabletProductsResponse {
  data: TabletProduct[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  /** Local products 가 함께 머지되어 내려오는 경우 (서비스/엔드포인트 의존) */
  localProducts?: unknown[];
}

export interface InterestSubmitResult {
  requestId: string;
  status: string;
  productName: string;
  createdAt: string;
}

export interface InterestStatusDetail {
  id: string;
  status: 'REQUESTED' | 'ACKNOWLEDGED' | 'COMPLETED' | 'CANCELLED';
  productName: string;
  customerName?: string;
  customerNote?: string;
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface TabletInterestSubmitBody {
  masterId: string;
  customerName?: string;
  customerNote?: string;
}

export type TabletProductsParams = {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
};

/**
 * 서비스 wrapper 가 주입하는 API 함수 집합.
 * (KPA = fetch 직접, Cosmetics = axios 인스턴스 — HTTP 클라이언트 차이는 wrapper 가 흡수)
 */
export interface TabletKioskApi {
  fetchProducts: (
    slug: string,
    params?: TabletProductsParams,
  ) => Promise<TabletProductsResponse>;
  submitInterest: (
    slug: string,
    body: TabletInterestSubmitBody,
  ) => Promise<InterestSubmitResult>;
  checkStatus: (
    slug: string,
    interestId: string,
  ) => Promise<InterestStatusDetail>;
}
