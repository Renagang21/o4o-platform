import type { EntityManager } from "typeorm";
import { NeturePharmacyError } from "../neture-pharmacy/constants.js";
import { resolveBusinessStoreAccess } from "../neture-pharmacy/services/business-store-access.js";
import {
  assertInboxWriter,
  resolveInboxScope,
  type InboxScope,
} from "../contact-inquiry/inbox-scope.js";
export type Executor = Pick<EntityManager, "query">;
export interface Subject {
  type: "pharmacy" | "person";
  id: string;
  userId: string;
}
const denied = () =>
  new NeturePharmacyError(
    403,
    "COOPERATION_MEMBERSHIP_REQUIRED",
    "이 공간의 현재 가입 승인과 이용 권한을 확인해 주세요.",
  );
export async function requireMember(
  exec: Executor,
  scope: InboxScope,
  userId: string,
  organizationId?: string,
  lock = false,
): Promise<Subject> {
  if (lock)
    await exec.query("SELECT id FROM users WHERE id=$1 FOR SHARE", [userId]);
  if (scope.kind === "business" && organizationId) {
    if (lock) {
      await exec.query("SELECT id FROM semi_franchises WHERE id=$1 FOR SHARE", [
        scope.businessId,
      ]);
      await exec.query(
        "SELECT id FROM semi_franchise_memberships WHERE semi_franchise_id=$1 AND organization_id=$2::uuid FOR SHARE",
        [scope.businessId, organizationId],
      );
      await exec.query(
        "SELECT id FROM organization_members WHERE user_id=$1 AND organization_id=$2::uuid FOR SHARE",
        [userId, organizationId],
      );
      await exec.query(
        "SELECT id FROM neture_pharmacy_memberships WHERE organization_id=$1::uuid FOR SHARE",
        [organizationId],
      );
    }
    if (
      !(
        await resolveBusinessStoreAccess(
          exec,
          userId,
          organizationId,
          scope.key,
        )
      ).allowed
    )
      throw denied();
    return { type: "pharmacy", id: organizationId, userId };
  }
  if (scope.kind !== "cooperative" || organizationId) throw denied();
  if (lock) {
    await exec.query("SELECT id FROM cooperatives WHERE id=$1 FOR SHARE", [
      scope.cooperativeId,
    ]);
    await exec.query("SELECT id FROM semi_franchises WHERE id=$1 FOR SHARE", [
      scope.businessId,
    ]);
    await exec.query(
      "SELECT id FROM cooperative_memberships WHERE cooperative_id=$1 AND user_id=$2 FOR SHARE",
      [scope.cooperativeId, userId],
    );
  }
  const [member] = await exec.query(
    `SELECT 1 FROM cooperative_memberships cm JOIN cooperatives c ON c.id=cm.cooperative_id
    JOIN semi_franchises sf ON sf.id=c.semi_franchise_id AND sf.status='active' JOIN users u ON u.id=cm.user_id WHERE c.id=$1 AND c.status='active' AND cm.user_id=$2 AND cm.status='active'
    AND u.status IN ('active','approved') AND u."isActive"=true AND u."isEmailVerified"=true
    AND NOT EXISTS(SELECT 1 FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key='neture' AND sm.status IN ('suspended','withdrawn'))`,
    [scope.cooperativeId, userId],
  );
  if (!member) throw denied();
  return { type: "person", id: userId, userId };
}
export function scopeParams(scope: InboxScope) {
  return [scope.businessId, scope.cooperativeId ?? null];
}
export const workScope =
  "business_id=$1 AND cooperative_id IS NOT DISTINCT FROM $2::uuid";
/** These are eligible membership UNITS, never a conversion from a cooperative person to a pharmacy grant. */
export function subjectSource(scope: InboxScope) {
  return scope.kind === "cooperative"
    ? {
        sql: `SELECT cm.user_id AS id,u.name AS name FROM cooperative_memberships cm JOIN users u ON u.id=cm.user_id
      JOIN cooperatives c ON c.id=cm.cooperative_id WHERE cm.cooperative_id=$1 AND cm.status='active' AND c.status='active'
      AND u.status IN ('active','approved') AND u."isActive"=true AND u."isEmailVerified"=true
      AND NOT EXISTS(SELECT 1 FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key='neture' AND sm.status IN ('suspended','withdrawn'))`,
        params: [scope.cooperativeId],
        type: "person",
      }
    : {
        sql: `SELECT m.organization_id AS id,o.name AS name FROM semi_franchise_memberships m JOIN organizations o ON o.id=m.organization_id
      JOIN neture_pharmacy_memberships p ON p.organization_id=m.organization_id AND p.status='active'
      WHERE m.semi_franchise_id=$1 AND m.status='active'`,
        params: [scope.businessId],
        type: "pharmacy",
      };
}

/** Use the canonical operator guard and lock its live business before writing workflow rows. */
export async function assertOperator(
  manager: EntityManager,
  scope: InboxScope,
  user: string,
) {
  await assertInboxWriter(manager, scope, user);
  await manager.query("SELECT id FROM semi_franchises WHERE id=$1 FOR SHARE", [
    scope.businessId,
  ]);
  await manager.query(
    "SELECT user_id FROM service_memberships WHERE user_id=$1 AND service_key='neture' FOR SHARE",
    [user],
  );
  const live = await resolveInboxScope(manager, scope.kind, scope.key);
  if (
    live.businessId !== scope.businessId ||
    live.cooperativeId !== scope.cooperativeId
  )
    throw denied();
}
