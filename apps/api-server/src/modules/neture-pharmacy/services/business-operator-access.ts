/** Fixed sf alias and $1 user bind. Never interpolate request input into this predicate. */
export const BUSINESS_OPERATOR_PREDICATE = `EXISTS (
  SELECT 1 FROM role_assignments ra WHERE ra.user_id = $1 AND ra.is_active = true
    AND (ra.valid_from IS NULL OR ra.valid_from <= CURRENT_TIMESTAMP)
    AND (ra.valid_until IS NULL OR ra.valid_until >= CURRENT_TIMESTAMP)
    AND (
      (ra.role IN ('neture:admin','neture:operator') AND EXISTS (
        SELECT 1 FROM semi_franchise_operators op WHERE op.semi_franchise_id = sf.id
          AND op.user_id = $1 AND op.revoked_at IS NULL))
      OR (sf.key IN ('pharmacy','carepharm','megapharm','pharmcoop')
        AND ra.role IN ('neture:' || sf.key || '_admin', 'neture:' || sf.key || '_operator'))
      OR (ra.role IN ('neture:pharmcoop_admin','neture:pharmcoop_operator') AND EXISTS (
        SELECT 1 FROM cooperatives c WHERE c.semi_franchise_id = sf.id))
    )
)`;
export async function hasBusinessOperatorAccess(exec: { query: (sql: string, parameters?: any[]) => Promise<any[]> }, userId: string, businessId: string): Promise<boolean> {
  const rows = await exec.query(`SELECT 1 FROM semi_franchises sf WHERE sf.id=$2 AND ${BUSINESS_OPERATOR_PREDICATE} LIMIT 1`, [userId, businessId]);
  return rows.length > 0;
}
