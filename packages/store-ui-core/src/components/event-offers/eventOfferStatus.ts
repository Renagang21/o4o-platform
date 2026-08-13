/**
 * eventOfferStatus — 이벤트 오퍼 상태 라벨 공통 매핑 (UI-level only)
 *
 * WO-O4O-STORE-HUB-EVENT-OFFER-COMMONIZATION-V1
 *
 * 상태 자체는 **backend 가 authoritative** 하다.
 * (EventOfferService 가 approved row 에 대해 start_at/end_at/total_quantity 로
 *  upcoming | active | sold_out | ended 를 런타임 계산한다.)
 * 따라서 frontend 는 날짜로 상태를 다시 판정하지 않는다. 본 모듈은
 * **서버가 준 status 문자열 → 표시 라벨** 매핑만 담는다.
 *
 * DB/API enum 은 변경하지 않는다. 스타일(배지 색·클래스·inline style)은
 * 각 화면이 그대로 소유한다 — 라벨만 공통이다.
 */

/** backend 계약 상태값 (event-offer.service.ts) */
export type EventOfferStatusKey =
  | 'pending'
  | 'rejected'
  | 'canceled'
  | 'upcoming'
  | 'active'
  | 'sold_out'
  | 'ended';

/**
 * 매장(구매자) 화면 기준 라벨.
 *
 * 공급자 화면(Neture SupplierEventOfferPage)은 같은 status 를 공급자 관점 문구
 * ('검토중' 등)로 표시한다 — 업무 의미가 달라 공통화하지 않는다.
 */
export const EVENT_OFFER_STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  rejected: '반려',
  canceled: '취소',
  upcoming: '곧 시작',
  active: '진행중',
  sold_out: '매진',
  ended: '종료',
  /** legacy: 승인 직후 파생 상태 계산 이전 값 (구 응답 호환) */
  approved: '승인됨',
};

/** 알 수 없는 status 는 '종료' 로 보수적으로 표시한다 (기존 화면 동작과 동일). */
export function resolveEventOfferStatusLabel(status: string | null | undefined): string {
  return (status && EVENT_OFFER_STATUS_LABEL[status]) || EVENT_OFFER_STATUS_LABEL.ended;
}
