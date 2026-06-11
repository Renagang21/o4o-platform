/**
 * Order Collection Status — metadata 계약 (V1)
 *
 * WO-O4O-ORDER-COLLECTION-STATUS-METADATA-CONTRACT-V1
 * 상위: IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1
 *
 * 목적: B2B / 인보이스 / 운영자 확인 주문의 "수금 확인됨" 상태를 paymentStatus='paid'
 *   만으로 표현하기 어려운 경우를 위해, order metadata 의 collection 계약을 고정한다.
 *   V1 은 **DB 컬럼을 추가하지 않고** metadata(jsonb) 계약으로 시작한다. V2 에서 필요 시 컬럼 승격.
 *
 * 이 계약 필드명(`collectionStatus`)은 이미 다음 guard 들이 읽고 있는 것과 **정확히 일치**한다:
 *   - fulfillment guard: supplier-order.service.ts `getFulfillmentReadiness`
 *       collectionReady := metadata.collectionStatus === 'confirmed'
 *   - settlement guard: neture-settlement.service.ts `calculateSettlements`
 *       ... OR o.metadata->>'collectionStatus' = 'confirmed'
 *
 * readiness 모델(IR 정합):
 *   fulfillmentReady := paymentStatus='paid' OR collectionStatus='confirmed'
 *   settlementReady  := delivered AND (paymentStatus='paid' OR collectionStatus='confirmed')
 *
 * 순수 모듈(엔티티/서비스 import 없음) — import cycle 방지. checkout / neture 양쪽에서 안전하게 사용.
 */

/** 수금 확인 상태. confirmed 만이 배송/정산 readiness 후보. */
export type OrderCollectionStatus =
  | 'pending' // 수금 확인 전. 배송/정산 불가.
  | 'confirmed' // 수금 확인 완료. 배송/정산 가능 후보.
  | 'failed' // 수금 실패. 배송/정산 불가.
  | 'cancelled' // 수금 전 취소. 배송/정산 불가.
  | 'refunded'; // 수금 후 환불. 배송/정산 불가.

/** 수금 방식. */
export type OrderCollectionMethod =
  | 'online_payment' // PG 결제 완료. 일반적으로 paymentStatus='paid' 와 함께 사용.
  | 'invoice' // 인보이스/세금계산서/후불 청구.
  | 'operator_confirmed' // 운영자가 수금/결제 가능 상태 확인.
  | 'manual_bank_transfer'; // 무통장/계좌이체 등 수동 입금 확인.

/** order metadata 의 collection 계약 부분 집합. */
export interface OrderCollectionMetadata {
  collectionStatus?: OrderCollectionStatus;
  collectionMethod?: OrderCollectionMethod;
  /** ISO 8601 */
  collectionConfirmedAt?: string;
  /** 확인 주체 userId */
  collectionConfirmedBy?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 수금 확인 완료 여부 — guard/정산이 readiness 로 인정하는 단일 판정.
 * (fulfillment/settlement guard 와 동일한 `collectionStatus === 'confirmed'` 의미.)
 */
export function isCollectionConfirmed(metadata: unknown): boolean {
  return isRecord(metadata) && metadata.collectionStatus === 'confirmed';
}

/**
 * 수금 확인 metadata 조각을 생성한다.
 *
 * **merge 원칙**: 반환값은 기존 metadata 위에 spread 로 병합한다(기존 필드 보존).
 *   예) `{ ...order.metadata, ...buildCollectionConfirmedMetadata({...}) }`
 *   기존 metadata 를 통째로 덮어쓰지 말 것.
 */
export function buildCollectionConfirmedMetadata(params: {
  method: OrderCollectionMethod;
  confirmedBy: string;
  confirmedAt?: Date;
}): Required<OrderCollectionMetadata> {
  return {
    collectionStatus: 'confirmed',
    collectionMethod: params.method,
    collectionConfirmedBy: params.confirmedBy,
    collectionConfirmedAt: (params.confirmedAt ?? new Date()).toISOString(),
  };
}
