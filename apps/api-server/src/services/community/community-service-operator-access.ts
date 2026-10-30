import { readCommunityServiceMembership } from './community-service-membership.js';
import type { EntityManager } from 'typeorm';

/** Central assignment is effective only with current active service membership and role. */
export async function hasCommunityServiceOperator(exec: Pick<EntityManager, 'query'>, userId: string, adminOnly = false): Promise<boolean> {
  const member = await readCommunityServiceMembership(exec, userId);
  if (!member.eligible) return false;
  const root = await exec.query(`SELECT 1 FROM role_assignments WHERE user_id=$1 AND role='platform:super_admin'
    AND is_active=true AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>=now()) LIMIT 1`, [userId]);
  if (root.length) return true; // O4O direct community only; no independent business or membership creation.
  if (member.status !== 'active') return false;
  const rows = await exec.query(
    `SELECT 1 FROM role_assignments ra
      JOIN service_memberships sm ON sm.user_id = ra.user_id
       AND sm.service_key = 'community' AND sm.status = 'active'
     WHERE ra.user_id = $1 AND ra.is_active = true
       AND ra.valid_from <= CURRENT_TIMESTAMP
       AND (ra.valid_until IS NULL OR ra.valid_until >= CURRENT_TIMESTAMP)
       AND ra.role IN ('community:admin', 'community:operator')
       AND ($2 = false OR ra.role = 'community:admin') LIMIT 1`,
    [userId, adminOnly],
  );
  return rows.length > 0;
}

export const hasCommunityServiceAdmin = (exec: Pick<EntityManager, 'query'>, userId: string) =>
  hasCommunityServiceOperator(exec, userId, true);
