import { NeturePharmacyError } from '../constants.js';

type Executor = { query(sql: string, params: unknown[]): Promise<any[]> };

/** Selected organization authority and this business's live membership are one server decision.
 * Account-wide community access (another pharmacy or an operator assignment) is not a substitute.
 */
export async function resolveBusinessStoreAccess(exec: Executor, userId: string, organizationId: string, businessKey: string) {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(organizationId)) throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '선택한 약국에 접근할 수 없습니다.');
  const [row] = await exec.query(
    `SELECT sf.key AS "businessKey", sf.status AS "businessStatus",
            npm.status AS "pharmacyStatus", sfm.status AS "membershipStatus"
       FROM organization_members om
       JOIN users u ON u.id = om.user_id AND u."isActive" = true AND u."isEmailVerified" = true AND u.status IN ('active','approved')
       JOIN semi_franchises sf ON sf.key = $3
       LEFT JOIN neture_pharmacy_memberships npm ON npm.organization_id = om.organization_id
       LEFT JOIN semi_franchise_memberships sfm ON sfm.organization_id = om.organization_id AND sfm.semi_franchise_id = sf.id
      WHERE om.user_id = $1 AND om.organization_id = $2::uuid
        AND om.role IN ('owner','admin','manager') AND om.left_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM service_memberships main WHERE main.user_id = $1 AND main.service_key = 'neture' AND main.status IN ('suspended','withdrawn'))
      LIMIT 1`, [userId, organizationId, businessKey],
  );
  if (!row) throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '선택한 약국의 사업 이용 자격을 확인할 수 없습니다.');
  return {
    businessKey: row.businessKey as string, organizationId,
    allowed: row.businessStatus === 'active' && row.pharmacyStatus === 'active' && row.membershipStatus === 'active',
    membershipStatus: (row.membershipStatus ?? null) as string | null,
  };
}
