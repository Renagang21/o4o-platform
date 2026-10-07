/**
 * Neture 메인 가입 승인 판정 — 연결 서비스 신청 · 승인의 전제조건 (CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10)
 *
 * 기준: neture.co.kr 가입 승인(`service_memberships` service_key='neture' status='active')은
 *   메인 AI 자동화 이용 + 연결 서비스(내 매장(약국) · 세미프랜차이즈 · 공급자) **신청 자격**만 준다.
 *   연결 서비스는 각자 신청 · 승인하며, 서로의 원장을 바꾸지 않는다.
 *   - 연결 서비스 처리(승인 · 반려 · 재활성화)는 Neture 원장을 바꾸지 않는다 — 여기서는 읽기만 한다.
 *   - Neture 승인 · 반려 · 재활성화는 연결 서비스 원장이나 권한을 바꾸지 않는다.
 *
 * 판정은 매 요청 DB 에서 한다(JWT 스냅샷 불사용 — 정지 즉시성). serviceKey 는 고정 'neture' 이며
 * 요청값으로 바꿀 수 없다.
 */
import type { EntityManager } from 'typeorm';
import type { ServiceMembershipStatus } from '../../../utils/service-membership.js';

export const NETURE_MAIN_SERVICE_KEY = 'neture';

type QueryExec = { query: EntityManager['query'] };

/** Neture 메인 가입 상태. row 없음 · 알 수 없는 값 → 'none'. */
export async function getNetureMainMembershipStatus(exec: QueryExec, userId: string): Promise<ServiceMembershipStatus> {
  if (!userId) return 'none';
  const rows = await exec.query(
    `SELECT status FROM service_memberships WHERE user_id = $1 AND service_key = $2 LIMIT 1`,
    [userId, NETURE_MAIN_SERVICE_KEY],
  );
  const status = rows?.[0]?.status;
  switch (status) {
    case 'active':
    case 'pending':
    case 'rejected':
    case 'suspended':
    case 'withdrawn':
      return status;
    default:
      return 'none';
  }
}

/** 상태별 안내 문구 — API 오류 메시지와 화면 안내가 같은 말을 쓰게 한다. */
export const NETURE_MAIN_MEMBERSHIP_MESSAGES: Record<Exclude<ServiceMembershipStatus, 'active'>, string> = {
  none: 'Neture 가입 승인이 필요합니다.',
  pending: 'Neture 가입 승인 대기 중입니다.',
  rejected: 'Neture 가입이 반려되었습니다.',
  suspended: 'Neture 이용이 정지된 상태입니다.',
  withdrawn: 'Neture 가입이 해지된 상태입니다.',
};

export const NETURE_MEMBERSHIP_REQUIRED = 'NETURE_MEMBERSHIP_REQUIRED';

export class NetureMainMembershipRequiredError extends Error {
  readonly code = NETURE_MEMBERSHIP_REQUIRED;
  constructor(
    readonly membershipStatus: Exclude<ServiceMembershipStatus, 'active'>,
    message?: string,
    /** 본인 요청 403 · 운영자가 다른 사용자 신청을 처리할 때 409 */
    readonly httpStatus: 403 | 409 = 403,
  ) {
    super(message ?? NETURE_MAIN_MEMBERSHIP_MESSAGES[membershipStatus]);
    this.name = 'NetureMainMembershipRequiredError';
  }
}

/**
 * Neture 메인 가입이 active 가 아니면 던진다.
 * `subject='applicant'` 는 운영자가 다른 사용자의 신청을 승인할 때 — 문구를 신청자 기준으로 바꾼다.
 */
export async function assertNetureMainMembershipActive(
  exec: QueryExec,
  userId: string,
  subject: 'self' | 'applicant' = 'self',
): Promise<void> {
  const status = await getNetureMainMembershipStatus(exec, userId);
  if (status === 'active') return;
  const message = subject === 'applicant'
    ? `신청자의 Neture 가입이 승인 상태가 아닙니다(${status}). 연결 서비스 승인 전에 Neture 가입 승인이 필요합니다.`
    : undefined;
  throw new NetureMainMembershipRequiredError(status, message, subject === 'applicant' ? 409 : 403);
}
