import type { EntityManager } from "typeorm";
/** Only current usable service operators receive private inquiry alerts. No broadcast to other scopes. */
export function serviceContactRecipients(
  ds: Pick<EntityManager, "query">,
  prefix: string,
  serviceKey: string,
) {
  return ds.query(
    `SELECT DISTINCT ra.user_id AS "userId" FROM role_assignments ra
    JOIN users u ON u.id=ra.user_id
    LEFT JOIN service_memberships sm ON sm.user_id=u.id AND sm.service_key=$2
    WHERE ($2='neture' OR sm.status='active') AND ra.role=ANY($1::text[]) AND ra.is_active=true
    AND (ra.valid_from IS NULL OR ra.valid_from<=CURRENT_TIMESTAMP)
    AND (ra.valid_until IS NULL OR ra.valid_until>=CURRENT_TIMESTAMP)
    AND u.status IN ('active','approved') AND u."isActive"=true AND u."isEmailVerified"=true
    AND NOT EXISTS(SELECT 1 FROM service_memberships main WHERE main.user_id=u.id AND main.service_key='neture' AND main.status IN ('suspended','withdrawn'))`,
    [[`${prefix}:operator`, `${prefix}:admin`], serviceKey],
  ) as Promise<{ userId: string }[]>;
}
