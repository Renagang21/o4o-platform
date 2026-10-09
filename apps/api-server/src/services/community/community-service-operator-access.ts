import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';
import type { EntityManager } from 'typeorm';

/** Central assignment is effective only with current active service membership and role. */
export async function hasCommunityServiceOperator(exec: Pick<EntityManager, 'query'>, userId: string): Promise<boolean> {
  if (await getNetureMainMembershipStatus(exec, userId) !== 'active') return false;
  const rows = await exec.query(
    `SELECT 1 FROM role_assignments ra
      JOIN service_memberships sm ON sm.user_id = ra.user_id
       AND sm.service_key = 'community' AND sm.status = 'active'
     WHERE ra.user_id = $1 AND ra.is_active = true
       AND ra.role IN ('community:admin', 'community:operator') LIMIT 1`,
    [userId],
  );
  return rows.length > 0;
}
