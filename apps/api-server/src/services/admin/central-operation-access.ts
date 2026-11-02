import { ADMIN_OPERATIONS_OPERATOR_ROLES } from './admin-operations-operator-contract.js';
import type { DataSource } from "typeorm";
import {
  CENTRAL_OPERATION_ROLES,
  CENTRAL_DELEGATION_SCOPE,
} from "../../config/operator-role-catalog.js";

/** No invitation/audit row is used as durable authority: those have privacy retention deadlines. */
export async function centralOperationRoles(
  db: Pick<DataSource, "query">,
  userId: string,
  lock = false,
): Promise<string[]> {
  const rows: Array<{ role: string }> = await db.query(
    `SELECT ra.role
    FROM role_assignments ra JOIN users u ON u.id=ra.user_id
    WHERE ra.user_id=$1 AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved')
    AND ra.is_active=true AND (ra.valid_from IS NULL OR ra.valid_from<=now())
    AND (ra.valid_until IS NULL OR ra.valid_until>=now())
    AND (ra.role='platform:super_admin' OR (
      (ra.scope_type=$2 OR (ra.role=ANY($4::text[]) AND EXISTS (
        SELECT 1 FROM central_operation_menu_grants g WHERE g.assignment_id=ra.id AND g.admin_operations=true
      ))) AND ra.role=ANY($3::text[])
      AND NOT EXISTS (SELECT 1 FROM service_memberships main WHERE main.user_id=u.id AND main.service_key='neture' AND main.status IN ('suspended','withdrawn'))
      AND EXISTS (
        SELECT 1 FROM service_memberships sm WHERE sm.user_id=ra.user_id AND sm.status='active'
        AND sm.service_key=CASE WHEN ra.role LIKE 'neture:%' THEN 'neture' ELSE split_part(ra.role,':',1) END
      )
    )) ${lock ? "FOR SHARE OF ra,u" : ""}`,
    [userId, CENTRAL_DELEGATION_SCOPE, CENTRAL_OPERATION_ROLES, ADMIN_OPERATIONS_OPERATOR_ROLES],
  );
  return rows
    .map((row) => row.role)
    .filter(
      (role) =>
        role === "platform:super_admin" ||
        CENTRAL_OPERATION_ROLES.includes(role),
    );
}
