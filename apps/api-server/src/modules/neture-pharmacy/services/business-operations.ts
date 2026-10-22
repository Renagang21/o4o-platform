import type { DataSource } from "typeorm";
import { SemiFranchiseService } from "./semi-franchise.service.js";
import { cooperativeRole } from "./cooperative-management.service.js";
import { assertNetureMainMembershipActive } from "../../neture/services/neture-main-membership.js";
import { NeturePharmacyError } from "../constants.js";

/** Read current role/assignment, not role names supplied by a client or federation authority. */
export async function businessOperationsAccess(
  db: DataSource,
  actor: string,
  key: string,
) {
  const sf = await new SemiFranchiseService(db).requireOperatorOf(actor, key);
  if (sf.status !== "active")
    throw new NeturePharmacyError(
      404,
      "BUSINESS_NOT_FOUND",
      "운영 중인 사업을 찾을 수 없습니다.",
    );
  const [coop] = await db.query(
    "SELECT id FROM cooperatives WHERE semi_franchise_id=$1",
    [sf.id],
  );
  let canManagePolicies: boolean;
  if (coop)
    canManagePolicies = (await cooperativeRole(db, actor, coop.id)) === "admin";
  else {
    await assertNetureMainMembershipActive(db, actor);
    const rows = await db.query(
      `SELECT 1 FROM role_assignments ra WHERE ra.user_id=$1 AND ra.is_active=true
      AND (ra.valid_from IS NULL OR ra.valid_from<=CURRENT_TIMESTAMP)
      AND (ra.valid_until IS NULL OR ra.valid_until>=CURRENT_TIMESTAMP)
      AND (ra.role=$2 OR (ra.role='neture:admin' AND EXISTS
        (SELECT 1 FROM semi_franchise_operators op WHERE op.semi_franchise_id=$3 AND op.user_id=$1 AND op.revoked_at IS NULL))) LIMIT 1`,
      [actor, `neture:${sf.key}_admin`, sf.id],
    );
    canManagePolicies = rows.length > 0;
  }
  return { business: sf, canManagePolicies };
}

export async function businessDemandSummary(
  db: DataSource,
  actor: string,
  key: string,
  month: unknown,
) {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new NeturePharmacyError(
      400,
      "INVALID_MONTH",
      "조회 월을 확인해 주세요.",
    );
  const access = await businessOperationsAccess(db, actor, key);
  const stores = await db.query(
    `SELECT o.id, o.name,
    COALESCE(o.metadata#>ARRAY['staffSupport','demandCounts',$2], '{}'::jsonb) AS counts
    FROM semi_franchise_memberships m JOIN organizations o ON o.id=m.organization_id
    JOIN neture_pharmacy_memberships p ON p.organization_id=o.id AND p.status='active'
    JOIN semi_franchises sf ON sf.id=m.semi_franchise_id AND sf.status='active'
    WHERE m.semi_franchise_id=$1 AND m.status='active' ORDER BY o.name,o.id`,
    [access.business.id, month],
  );
  const reasons = ["not-found", "not-carried", "pharmacist-help"];
  for (const store of stores) {
    if (
      !store.counts ||
      typeof store.counts !== "object" ||
      Array.isArray(store.counts) ||
      Object.entries(store.counts).some(
        ([key, value]) =>
          !reasons.includes(key) ||
          !Number.isSafeInteger(value) ||
          Number(value) < 0,
      )
    )
      throw new NeturePharmacyError(
        503,
        "DEMAND_COUNTS_UNAVAILABLE",
        "고객 요구 집계를 확인하지 못했습니다. 다시 시도해 주세요.",
      );
  }
  return {
    businessKey: access.business.key,
    businessName: access.business.name,
    canManagePolicies: access.canManagePolicies,
    month,
    stores,
  };
}
