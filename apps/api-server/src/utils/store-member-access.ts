import type { DataSource } from 'typeorm';
import type { StoreOrganizationCandidate, StoreOwnerServiceKey } from './store-organization.resolver.js';

/** Approved pharmacy staff only. Recheck relationship, role and store status on every request. */
export async function findApprovedStoreMemberCandidates(
  dataSource: DataSource,
  userId: string,
  serviceKey?: StoreOwnerServiceKey,
): Promise<StoreOrganizationCandidate[]> {
  if (!userId || (serviceKey && serviceKey !== 'kpa')) return [];
  const rows: Array<{ organization_id: string }> = await dataSource.query(
    `SELECT om.organization_id
       FROM organization_members om
       JOIN neture_pharmacy_memberships pm ON pm.organization_id = om.organization_id AND pm.status = 'active'
      WHERE om.user_id = $1 AND om.left_at IS NULL AND om.role = 'staff'
        AND EXISTS (SELECT 1 FROM role_assignments ra
                     WHERE ra.user_id = om.user_id AND ra.role = 'kpa:store_member' AND ra.is_active = true
                       AND ra.valid_from <= now() AND (ra.valid_until IS NULL OR ra.valid_until >= now()))
      ORDER BY om.is_primary DESC, om.joined_at ASC, om.organization_id ASC`,
    [userId],
  );
  return rows.map(row => ({ organizationId: row.organization_id, memberRole: 'staff' }));
}

export async function resolveApprovedStoreMemberOrganization(
  dataSource: DataSource,
  userId: string,
  serviceKey?: StoreOwnerServiceKey,
  preferredOrganizationId?: string | null,
): Promise<string | null> {
  const candidates = await findApprovedStoreMemberCandidates(dataSource, userId, serviceKey);
  if (preferredOrganizationId) {
    return candidates.some(c => c.organizationId === preferredOrganizationId) ? preferredOrganizationId : null;
  }
  return candidates.length === 1 ? candidates[0].organizationId : null;
}
