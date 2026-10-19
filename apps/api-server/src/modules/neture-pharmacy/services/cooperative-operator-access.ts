import type { EntityManager } from "typeorm";
import { getNetureMainMembershipStatus } from "../../neture/services/neture-main-membership.js";

/** Match the reused Neture operator API's live role validity and canonical main-access policy. */
export async function hasCooperativeOperatorAccess(
  exec: { query: EntityManager["query"] },
  userId: string,
): Promise<boolean> {
  const [role] = await exec.query(
    `SELECT 1 FROM role_assignments WHERE user_id=$1
    AND role IN ('neture:operator','neture:admin','neture:pharmcoop_admin','neture:pharmcoop_operator') AND is_active=true
    AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
    AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP) LIMIT 1`,
    [userId],
  );
  return (
    !!role && (await getNetureMainMembershipStatus(exec, userId)) === "active"
  );
}
