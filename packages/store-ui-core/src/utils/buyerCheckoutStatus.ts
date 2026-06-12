/**
 * Buyer Checkout Status Display — 3서비스 공통 매핑
 *
 * WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1
 *
 * KPA / GlycoPharm / K-Cosmetics 의 "내 매장 주문 내역"(buyer 구매/발주, checkout_orders)
 * 화면에서 동일 raw status 가 동일 문구·의미로 표시되도록 하는 표시 전용(presentation) 매핑.
 *
 * - 화면 표시 라벨/badge tone 만 정렬한다. 주문 상태 전이·결제 로직·backend enum·DB 는 변경하지 않는다.
 * - buyer 관점 문구만 사용한다(판매/출고/이행 문구 금지 — seller fulfillment 는 별도 IA).
 */

export type BuyerCheckoutTone = 'neutral' | 'warning' | 'success' | 'muted' | 'danger';

export interface BuyerCheckoutStatusDisplay {
  /** 정규화된 raw status key (소문자) */
  key: string;
  /** buyer 화면 표시 라벨 */
  label: string;
  /** badge 색 의미(tone). 서비스별 색상 시스템으로 매핑해 사용 */
  tone: BuyerCheckoutTone;
}

/** checkout_orders.status → buyer 표시 라벨/tone */
const ORDER_STATUS: Record<string, { label: string; tone: BuyerCheckoutTone }> = {
  created: { label: '주문 생성', tone: 'neutral' },
  pending_payment: { label: '결제 대기', tone: 'warning' },
  paid: { label: '결제 완료', tone: 'success' },
  cancelled: { label: '주문 취소', tone: 'muted' },
  canceled: { label: '주문 취소', tone: 'muted' }, // 철자 변형 방어
  failed: { label: '주문 실패', tone: 'danger' },
  refunded: { label: '환불 완료', tone: 'muted' },
  partially_refunded: { label: '부분 환불', tone: 'warning' },
};

const UNKNOWN: BuyerCheckoutStatusDisplay = { key: 'unknown', label: '상태 확인 필요', tone: 'neutral' };

/** raw order status → 표시 정보(key/label/tone). 미정의/빈값은 '상태 확인 필요' fallback */
export function getBuyerCheckoutStatusDisplay(status?: string | null): BuyerCheckoutStatusDisplay {
  const key = (status ?? '').toLowerCase();
  const hit = ORDER_STATUS[key];
  if (!hit) return { ...UNKNOWN, key: key || 'unknown' };
  return { key, label: hit.label, tone: hit.tone };
}

/** raw order status → 표시 라벨(문자열만) */
export function getBuyerCheckoutStatusLabel(status?: string | null): string {
  return getBuyerCheckoutStatusDisplay(status).label;
}

/** checkout_orders.paymentStatus → buyer 표시 라벨 (보조 표시용) */
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: '결제 대기',
  ready: '결제 대기',
  paid: '결제 완료',
  done: '결제 완료',
  completed: '결제 완료',
  failed: '결제 실패',
  cancelled: '결제 취소',
  canceled: '결제 취소',
  refunded: '환불 완료',
  partially_refunded: '부분 환불',
  partial_refunded: '부분 환불',
};

/** raw paymentStatus → 표시 라벨. 빈값은 '-', 미정의는 '상태 확인 필요' */
export function getBuyerPaymentStatusLabel(paymentStatus?: string | null): string {
  const key = (paymentStatus ?? '').toLowerCase();
  if (!key) return '-';
  return PAYMENT_STATUS_LABEL[key] ?? '상태 확인 필요';
}

/** tone → 기본 색상(hex). inline-style 소비처(KPA/KCos)에서 사용 */
export const BUYER_CHECKOUT_TONE_HEX: Record<BuyerCheckoutTone, { color: string; bg: string }> = {
  neutral: { color: '#2563EB', bg: '#DBEAFE' },
  warning: { color: '#D97706', bg: '#FEF3C7' },
  success: { color: '#059669', bg: '#D1FAE5' },
  danger: { color: '#DC2626', bg: '#FEE2E2' },
  muted: { color: '#6B7280', bg: '#F3F4F6' },
};

/** buyer 주문 목록 공통 상태 탭 (raw status key 기준) */
export const BUYER_CHECKOUT_STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'created', label: '주문 생성' },
  { key: 'pending_payment', label: '결제 대기' },
  { key: 'paid', label: '결제 완료' },
  { key: 'cancelled', label: '주문 취소' },
];
