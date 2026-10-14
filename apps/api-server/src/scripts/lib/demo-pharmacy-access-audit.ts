import { PUBLIC_DEMO_ACCOUNTS } from '@o4o/auth-utils';

type Queryable = { query(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]> };
export interface DemoPharmacyAccessPlan {
  userId: string;
  organizationId: string;
  createPharmacy: boolean;
  createRole: boolean;
}

/** Read-only census of the canonical Demo; writes belong to the approved migration. */
export async function inspectDemoPharmacyAccess(db: Queryable): Promise<DemoPharmacyAccessPlan> {
  const email = PUBLIC_DEMO_ACCOUNTS.find(a => a.type === 'STORE_OWNER')!.email;
  const users = await db.query(
    `SELECT u.id FROM users u JOIN demo_accounts d ON d.user_id = u.id
     WHERE u.email = $1 AND u.status = 'active' AND u."isActive" = true
       AND d.demo_type = 'STORE_OWNER' AND d.is_active = true`, [email],
  );
  if (users.length !== 1) throw new Error('CANONICAL_DEMO_NOT_RESOLVED');
  const userId = users[0].id as string;
  const memberships = await db.query(
    `SELECT id FROM service_memberships WHERE user_id = $1 AND service_key = 'neture' AND status = 'active'`, [userId],
  );
  if (memberships.length !== 1) throw new Error('DEMO_NETURE_MEMBERSHIP_NOT_ACTIVE');
  // Count all active ownership relations, then require the one explicit legacy Demo organization.
  // Never choose an arbitrary first store or attach to an unrelated organization.
  const owners = await db.query(
    `SELECT om.organization_id FROM organization_members om
     WHERE om.user_id = $1 AND om.role = 'owner' AND om.left_at IS NULL`, [userId],
  );
  if (owners.length !== 1 || owners[0].organization_id !== '9c87f46b-57a1-4afe-80bd-60782c49ce96')
    throw new Error('CANONICAL_DEMO_STORE_NOT_RESOLVED');
  const organizationId = owners[0].organization_id as string;
  const others = await db.query(
    `SELECT om.id FROM organization_members om JOIN users u ON u.id = om.user_id
     WHERE om.organization_id = $1 AND om.user_id <> $2
       AND om.role = ANY($3::text[]) AND om.left_at IS NULL`,
    [organizationId, userId, ['owner', 'admin', 'manager', 'staff']],
  );
  if (others.length) throw new Error('DEMO_STORE_HAS_OTHER_MEMBERS');
  const pharmacies = await db.query(
    `SELECT status, applicant_user_id FROM neture_pharmacy_memberships WHERE organization_id = $1`, [organizationId],
  );
  if (pharmacies.length > 1 || pharmacies.some(p => p.status !== 'active' || p.applicant_user_id !== userId))
    throw new Error('DEMO_PHARMACY_STATE_REQUIRES_REVIEW');
  if (!pharmacies.length) {
    const conflicts = await db.query(
      `SELECT id FROM neture_pharmacy_memberships WHERE applicant_user_id = $1
         OR (business_number = '0000000000' AND status IN ('pending','active','suspended'))`, [userId],
    );
    if (conflicts.length) throw new Error('DEMO_PHARMACY_CONFLICT');
  }
  const roles = await db.query(
    `SELECT id FROM role_assignments WHERE user_id = $1 AND role = 'neture:store_owner' AND is_active = true`, [userId],
  );
  return { userId, organizationId, createPharmacy: pharmacies.length === 0, createRole: roles.length === 0 };
}
