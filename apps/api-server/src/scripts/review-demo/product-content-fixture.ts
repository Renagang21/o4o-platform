import type { DataSource } from "typeorm";
import { MemberPaidFeatureService } from "../../modules/neture-pharmacy/services/member-paid-features.js";
import { assertReviewDatabase, REVIEW_PREPARED_MARKER } from "./environment.js";
import { reviewIds } from "./provision.js";

/** Synthetic eligibility only: this does not create a payment or change a real member. */
export async function enableReviewProductContentFixture(
  db: DataSource,
  apply = false,
) {
  await assertReviewDatabase(db);
  return db.transaction(async (manager) => {
    if (!apply) await manager.query("SET TRANSACTION READ ONLY");
    await manager.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('chatgpt-review-fixture',0))",
    );
    if ((await assertReviewDatabase(manager)) !== REVIEW_PREPARED_MARKER) {
      if (!apply) return { state: "base-fixture-required", writes: false };
      throw new Error("PREPARED_REVIEW_FIXTURE_REQUIRED");
    }
    const [fixture] = await manager.query(
      `SELECT u.id FROM users u
       JOIN organization_members m ON m.user_id=u.id AND m.organization_id=$2 AND m.role='owner'
       JOIN organizations o ON o.id=m.organization_id
       WHERE u.id=$1 AND u.email='reviewer@example.invalid'
         AND o.code='CHATGPT-REVIEW-SYNTHETIC'
         AND EXISTS(SELECT 1 FROM users WHERE id=$3 AND email='fixture-actor@example.invalid')`,
      [reviewIds.owner, reviewIds.store, reviewIds.fixtureActor],
    );
    if (!fixture) throw new Error("SYNTHETIC_REVIEW_FIXTURE_IDENTITY_REQUIRED");
    const [existing] = await manager.query(
      "SELECT active,(ends_at IS NULL OR ends_at>now()) AS valid FROM member_paid_service_entitlements WHERE user_id=$1",
      [reviewIds.owner],
    );
    if (existing?.active && existing.valid)
      return { state: "already-enabled", writes: false };
    if (!apply) return { state: "ready-to-enable", writes: false };
    await new MemberPaidFeatureService(manager).set(
      reviewIds.owner,
      reviewIds.fixtureActor,
      { active: true },
    );
    return { state: "enabled-synthetic-eligibility", writes: true };
  });
}
