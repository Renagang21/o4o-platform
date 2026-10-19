/** Fixed sf alias and $1 user bind. Never interpolate request input into this predicate. */
export const BUSINESS_OPERATOR_PREDICATE = `(
 (NOT EXISTS (SELECT 1 FROM cooperatives c WHERE c.semi_franchise_id=sf.id) AND EXISTS (
  SELECT 1 FROM role_assignments ra WHERE ra.user_id = $1 AND ra.is_active = true
    AND (ra.valid_from IS NULL OR ra.valid_from <= CURRENT_TIMESTAMP)
    AND (ra.valid_until IS NULL OR ra.valid_until >= CURRENT_TIMESTAMP)
    AND (
      (ra.role IN ('neture:admin','neture:operator') AND EXISTS (
        SELECT 1 FROM semi_franchise_operators op WHERE op.semi_franchise_id = sf.id
          AND op.user_id = $1 AND op.revoked_at IS NULL))
      OR (sf.key IN ('pharmacy','carepharm','megapharm','pharmcoop')
        AND ra.role IN ('neture:' || sf.key || '_admin', 'neture:' || sf.key || '_operator'))

    )
)) OR EXISTS (SELECT 1 FROM cooperative_roles cr JOIN cooperatives c ON c.id=cr.cooperative_id
 JOIN users u ON u.id=cr.user_id WHERE c.semi_franchise_id=sf.id AND cr.user_id=$1 AND cr.revoked_at IS NULL
 AND c.status='active' AND sf.status='active' AND u.status IN ('active','approved')
 AND u."isActive"=true AND u."isEmailVerified"=true)
)`;
export async function hasBusinessOperatorAccess(exec: { query: (sql: string, parameters?: any[]) => Promise<any[]> }, userId: string, businessId: string): Promise<boolean> {
  const rows = await exec.query(`SELECT 1 FROM semi_franchises sf WHERE sf.id=$2 AND ${BUSINESS_OPERATOR_PREDICATE} LIMIT 1`, [userId, businessId]);
  return rows.length > 0;
}
