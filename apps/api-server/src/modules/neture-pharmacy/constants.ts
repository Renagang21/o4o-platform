/**
 * Neture 약국 매장 commerce — 상수 · 오류 · 상태 전이
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 / docs/design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md
 */

/** 장바구니 · 주문 metadata.serviceKey · neture_orders.service_key */
export const NETURE_PHARMACY_SERVICE_KEY = 'neture-pharmacy';
/** checkout_orders.metadata.source — fulfillment bridge 등록 키 */
export const NETURE_PHARMACY_ORDER_SOURCE = 'neture_pharmacy_cart';
/** o4o_payments.sourceService */
export const NETURE_PHARMACY_PAYMENT_SOURCE = 'neture-pharmacy';
/** 세미프랜차이즈 이벤트 원장 OPL.service_key (최종 부분 UNIQUE 제외 대상 — 1단계는 전체 UNIQUE, semi-franchise-event.service 머리말) */
export const SEMI_FRANCHISE_EVENT_SERVICE_KEY = 'neture-event-offer';
/** 공급처 미지정 제품의 기본 공급 경로 */
export const DEFAULT_SEMI_FRANCHISE_KEY = 'pharmacy';

/** 매장 조직에서 매장을 운영할 수 있는 organization_members.role (기존 STORE_MEMBER_ROLES 와 같은 집합) */
export const PHARMACY_STORE_MEMBER_ROLES = ['owner', 'admin', 'manager'] as const;

export type SupplyKind = 'default' | 'proposal' | 'event' | 'recruitment';
export const SUPPLY_KINDS: readonly SupplyKind[] = ['default', 'proposal', 'event', 'recruitment'];

export class NeturePharmacyError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'NeturePharmacyError';
  }
}

// ─── 가입 상태 전이 (기본 가입 · 세미프랜차이즈 가입 공용) ──────────────────────

export type MembershipStatus = 'pending' | 'active' | 'rejected' | 'suspended' | 'terminated';
export type MembershipAction = 'approve' | 'reject' | 'suspend' | 'reactivate' | 'terminate';

const TRANSITIONS: Record<MembershipAction, { from: readonly MembershipStatus[]; to: MembershipStatus }> = {
  approve: { from: ['pending'], to: 'active' },
  reject: { from: ['pending'], to: 'rejected' },
  suspend: { from: ['active'], to: 'suspended' },
  reactivate: { from: ['suspended'], to: 'active' },
  terminate: { from: ['active', 'suspended'], to: 'terminated' },
};

export const MEMBERSHIP_ACTIONS = Object.keys(TRANSITIONS) as MembershipAction[];

/** 운영자 처리 결과 상태. 허용되지 않는 전이면 null. */
export function nextMembershipStatus(current: MembershipStatus, action: MembershipAction): MembershipStatus | null {
  const t = TRANSITIONS[action];
  if (!t) return null;
  return t.from.includes(current) ? t.to : null;
}

/** 약국 본인이 다시 신청할 수 있는 상태(같은 행을 pending 으로 되돌린다). */
export function canReapply(current: MembershipStatus): boolean {
  return current === 'rejected' || current === 'terminated';
}

/**
 * 결제 수취 주체 키. 미확정(NULL)이면 세미프랜차이즈마다 따로 묶는다 —
 * 서로 같은 수취 주체인지 알 수 없으므로 합치지 않는다(D1).
 */
export function receiverKeyOf(semiFranchiseKey: string, paymentReceiverKey: string | null | undefined): string {
  return paymentReceiverKey && paymentReceiverKey.trim() ? paymentReceiverKey.trim() : `undetermined:${semiFranchiseKey}`;
}

export function isReceiverDetermined(receiverKey: string): boolean {
  return !receiverKey.startsWith('undetermined:');
}

/** 수량 검사 — 기존 B2B 검사(1..1000)를 그대로 유지한다(D2). 새 상한을 만들지 않는다. */
export function isValidOrderQuantity(quantity: unknown): quantity is number {
  return Number.isInteger(quantity) && (quantity as number) > 0 && (quantity as number) <= 1000;
}

/**
 * TypeORM postgres 드라이버는 UPDATE · DELETE 쿼리 결과를 `[rows, affectedCount]` 로 돌려준다(SELECT · INSERT 는 rows).
 * `... RETURNING` 행을 읽는 곳은 이 함수로 정규화한다.
 */
export function rowsOf<T = any>(result: unknown): T[] {
  if (Array.isArray(result) && result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
    return result[0] as T[];
  }
  return (Array.isArray(result) ? result : []) as T[];
}
