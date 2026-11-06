import { hasApprovedPharmacist } from "./pharmacist-qualification.service.js";

/** Synthetic experience qualification, restricted to the registered Demo owner's own approved pharmacy.
 * Does not approve a real licence or grant global pharmacist/central permissions.
 */
export async function hasApprovedStorePharmacist(
  db: { query(sql: string, parameters?: any[]): Promise<any[]> },
  userId: string,
  organizationId: string | null,
): Promise<boolean> {
  if (await hasApprovedPharmacist(db, userId)) return true;
  if (!organizationId) return false;
  const [row] = await db.query(
    `SELECT EXISTS (
    SELECT 1 FROM demo_accounts d
    JOIN users u ON u.id=d.user_id
    JOIN organization_members om ON om.user_id=d.user_id AND om.organization_id=$2
    JOIN organizations o ON o.id=om.organization_id AND o.type='pharmacy'
    JOIN neture_pharmacy_memberships pm ON pm.organization_id=o.id AND pm.applicant_user_id=d.user_id
    WHERE d.user_id=$1 AND d.is_active=true AND d.demo_type='STORE_OWNER'
    AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved')
    AND om.role='owner' AND om.left_at IS NULL AND pm.status='active'
    AND EXISTS (SELECT 1 FROM service_memberships sm WHERE sm.user_id=d.user_id AND sm.service_key='neture' AND sm.status='active')
    AND NOT EXISTS (SELECT 1 FROM kpa_pharmacist_profiles p WHERE p.user_id=d.user_id AND p.qualification_status<>'unrequested')
  ) AS approved`,
    [userId, organizationId],
  );
  return row?.approved === true;
}
