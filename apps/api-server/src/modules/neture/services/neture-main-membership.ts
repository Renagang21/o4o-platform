/**
 * Neture 메인 가입 승인 판정 — 연결 서비스 신청 · 승인의 전제조건 (CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10)
 *
 * 기준: neture.co.kr 가입 완료(확인된 이메일과 정상 계정)는
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

/** Main access is verified email plus a usable account, not manual service approval.
 * Explicit service suspension/withdrawal remains effective. Old pending/rejected
 * application rows do not require an operator to approve an email-verified account.
 */
export async function getNetureMainMembershipStatus(exec: QueryExec, userId: string): Promise<ServiceMembershipStatus> {
  if (!userId) return 'none';
  const rows = await exec.query(
    `SELECT u.status AS account_status, u."isActive" AS account_active,
            u."isEmailVerified" AS email_verified, sm.status AS membership_status
       FROM users u
       LEFT JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = $2
      WHERE u.id = $1 LIMIT 1`,
    [userId, NETURE_MAIN_SERVICE_KEY],
  );
  const row = rows?.[0];
  if (!row) return 'none';
  if (row.account_status === 'suspended' || row.account_active === false) return 'suspended';
  if (row.account_status === 'rejected') return 'rejected';
  if (row.account_status !== 'active' && row.account_status !== 'approved') return 'pending';
  if (row.membership_status === 'suspended' || row.membership_status === 'withdrawn') return row.membership_status;
  return row.email_verified === true ? 'active' : 'pending';
}

/** 상태별 안내 문구 — API 오류 메시지와 화면 안내가 같은 말을 쓰게 한다. */
export const NETURE_MAIN_MEMBERSHIP_MESSAGES: Record<Exclude<ServiceMembershipStatus, 'active'>, string> = {
  none: 'Neture 계정 가입과 이메일 확인이 필요합니다.',
  pending: '이메일 확인 또는 계정 상태 확인이 필요합니다.',
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
    ? `신청자의 메인 이용 자격이 확인되지 않았습니다(${status}). 이메일 확인과 계정 상태를 확인해 주세요.`
    : undefined;
  throw new NetureMainMembershipRequiredError(status, message, subject === 'applicant' ? 409 : 403);
}
