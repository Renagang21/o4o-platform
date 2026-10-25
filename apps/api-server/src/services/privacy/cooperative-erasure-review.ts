import type { EntityManager } from "typeorm";

/** Called while the erasure writer barrier is held: role/account writes are fenced. */
export async function cooperativeAdminTransferRequired(
  exec: Pick<EntityManager, "query">,
  userId: string,
): Promise<boolean> {
  const [row] = await exec.query(
    `SELECT EXISTS (
    SELECT 1 FROM cooperative_roles target
    WHERE target.user_id=$1 AND target.role='admin' AND target.revoked_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM cooperative_roles other JOIN users u ON u.id=other.user_id
        WHERE other.cooperative_id=target.cooperative_id AND other.user_id<>$1
          AND other.role='admin' AND other.revoked_at IS NULL
          AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved')
      )
    ) AS required`,
    [userId],
  );
  return row?.required === true;
}
