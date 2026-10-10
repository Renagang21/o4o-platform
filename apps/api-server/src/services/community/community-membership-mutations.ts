import type { EntityManager } from 'typeorm';
import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';

type Exec = Pick<EntityManager, 'query'>;
export class CommunityMembershipMutationError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string) { super(message); }
}

export async function hasEligibleCommunityMembership(m: Exec, userId: string): Promise<boolean> {
  await m.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
  const rows = await m.query(
    "SELECT service_key, status FROM service_memberships WHERE user_id = $1 AND service_key IN ('community', 'neture') ORDER BY service_key FOR UPDATE", [userId],
  );
  return rows.some((r: { status: string; service_key: string }) => r.service_key === 'community' && r.status === 'active') &&
    await getNetureMainMembershipStatus(m, userId) === 'active';
}

export async function protectLastCommunityAdmin(m: Exec, communityId: string, excludedId: string): Promise<void> {
  const admins = await m.query(
    "SELECT id, user_id FROM community_memberships WHERE community_id = $1 AND id <> $2 AND role = 'admin' AND status = 'active' ORDER BY user_id FOR UPDATE", [communityId, excludedId],
  );
  for (const admin of admins) {
    if (await hasEligibleCommunityMembership(m, admin.user_id)) return;
  }
  throw new CommunityMembershipMutationError(409, 'LAST_ADMIN_PROTECTED', '운영 가능한 마지막 admin은 변경할 수 없습니다. 다른 admin을 먼저 지정하세요.');
}

export async function recordCommunityMembershipChange(m: Exec, input: {
  communityId: string; membershipId: string; actorUserId: string; action: string;
  beforeRole: string | null; afterRole: string; beforeStatus: string | null; afterStatus: string; reason?: string | null;
}): Promise<void> {
  if (!input.actorUserId) throw new CommunityMembershipMutationError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
  await m.query(`INSERT INTO community_membership_changes
    (community_id, membership_id, actor_user_id, action, before_role, after_role, before_status, after_status, reason)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
  [input.communityId, input.membershipId, input.actorUserId, input.action, input.beforeRole, input.afterRole, input.beforeStatus, input.afterStatus, input.reason ?? null]);
}
