import type { EntityManager } from 'typeorm';
import { PolicyAcceptanceError } from '../../modules/policy-acceptance/policy-acceptance.service.js';
import { recordEnrollmentApplication, recordEnrollmentPolicies, type EnrollmentPolicyReference } from '../../modules/policy-acceptance/service-enrollment-policy.service.js';

type Exec = Pick<EntityManager, 'query'>;

/** Common identity is shared; another service's membership is never an eligibility source. */
export async function readCommunityServiceMembership(exec: Exec, userId: string) {
  const [account] = await exec.query(`SELECT status, "isActive" AS active, "isEmailVerified" AS verified FROM users WHERE id = $1`, [userId]);
  const eligible = !!account && account.active === true && account.verified === true && ['active', 'approved'].includes(account.status);
  const [membership] = await exec.query(`SELECT id, status FROM service_memberships WHERE user_id = $1 AND service_key = 'community'`, [userId]);
  return { eligible, status: membership?.status as string | undefined, id: membership?.id as string | undefined };
}

/** Caller owns the transaction. Lock account before membership, as the operator console does. */
export async function requestCommunityServiceMembership(m: EntityManager, userId: string, references?: EnrollmentPolicyReference[]) {
  await m.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
  const current = await readCommunityServiceMembership(m, userId);
  if (!current.eligible) throw new PolicyAcceptanceError('ACCOUNT_NOT_ACTIVE', '공통 계정의 이메일 확인과 이용 상태를 확인해 주세요.', 403);
  if (current.status === 'active' || current.status === 'pending') return { status: current.status, requestSubmitted: false };
  // A suspension or withdrawal is managed by this service's operators, never undone by joining.
  if (current.status && current.status !== 'rejected') throw new PolicyAcceptanceError('MEMBERSHIP_NOT_ACTIVE', '커뮤니티 서비스 이용 상태는 운영자에게 확인해 주세요.', 403);
  const policies = await recordEnrollmentPolicies(m, userId, 'community', references);
  const [membership] = await m.query(`INSERT INTO service_memberships (user_id, service_key, role, status, created_at, updated_at)
    VALUES ($1, 'community', 'member', 'pending', NOW(), NOW())
    ON CONFLICT (user_id, service_key) DO UPDATE SET status = 'pending', role = 'member', updated_at = NOW()
      WHERE service_memberships.status = 'rejected'
    RETURNING id, status`, [userId]);
  if (!membership) throw new PolicyAcceptanceError('MEMBERSHIP_CHANGED', '회원 상태가 변경되었습니다. 다시 확인해 주세요.', 409);
  await recordEnrollmentApplication(m, userId, 'community', { type: 'service_membership', id: membership.id }, policies);
  return { status: membership.status as string, requestSubmitted: true };
}
