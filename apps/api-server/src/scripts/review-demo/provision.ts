import type { DataSource } from "typeorm";
import { passwordCredentialService } from "../../services/auth/password-credential.service.js";
import { checkPasswordPolicy } from "@o4o/auth-utils";
import { defaultSettings } from "../../modules/external-ai/contracts.js";
import { assertReviewDatabase, REVIEW_PREPARED_MARKER } from "./environment.js";

export const reviewIds = {
  owner: "d04d0000-0000-4000-8000-000000000001",
  fixtureActor: "d04d0000-0000-4000-8000-000000000002",
  store: "d04d0000-0000-4000-8000-000000000003",
  product: "d04d0000-0000-4000-8000-000000000004",
  material: "d04d0000-0000-4000-8000-000000000005",
} as const;

export async function provisionReviewDemo(
  db: DataSource,
  password: string,
  apply = false,
) {
  // Validate before opening a write transaction. Never log or return the supplied password.
  const policy = checkPasswordPolicy(password);
  if (policy.length) throw new Error("REVIEW_DEMO_PASSWORD_POLICY_REQUIRED");
  await assertReviewDatabase(db);
  return db.transaction(async (manager) => {
    if (!apply) await manager.query("SET TRANSACTION READ ONLY");
    await manager.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('chatgpt-review-fixture',0))",
    );
    const marker = await assertReviewDatabase(manager);
    if (marker === REVIEW_PREPARED_MARKER)
      return { state: "already-prepared", writes: false };
    const [rows] = await manager.query("SELECT count(*)::int AS n FROM users");
    if (rows.n !== 0) throw new Error("EMPTY_REVIEW_DATABASE_REQUIRED");
    if (!apply) return { state: "ready-to-prepare", writes: false };

    await manager.query(
      `INSERT INTO users(id,email,name,status,"isActive","isEmailVerified")
      VALUES($1,'reviewer@example.invalid','O4O 심사 전용 Demo','active',true,true),
      ($2,'fixture-actor@example.invalid','SYNTHETIC FIXTURE ACTOR — NOT A REAL REVIEWER','active',true,true)`,
      [reviewIds.owner, reviewIds.fixtureActor],
    );
    await passwordCredentialService.setPassword(
      reviewIds.owner,
      password,
      manager,
    );
    await manager.query(
      `INSERT INTO service_memberships(user_id,service_key,role,status)
      VALUES($1,'neture','member','active')`,
      [reviewIds.owner],
    );
    await manager.query(
      `INSERT INTO organizations(id,name,code,type)
      VALUES($1,'심사용 테스트 약국 — 합성 데이터','CHATGPT-REVIEW-SYNTHETIC','pharmacy')`,
      [reviewIds.store],
    );
    await manager.query(
      `INSERT INTO organization_members(organization_id,user_id,role)
      VALUES($1,$2,'owner')`,
      [reviewIds.store, reviewIds.owner],
    );
    await manager.query(
      `INSERT INTO role_assignments(user_id,role,is_active)
      VALUES($1,'neture:store_owner',true)`,
      [reviewIds.owner],
    );
    await manager.query(
      `INSERT INTO neture_pharmacy_memberships
      (organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number)
      VALUES($1,$2,'active','심사용 합성 약국','REVIEW-ONLY','SYNTHETIC-NOT-A-LICENSE')`,
      [reviewIds.store, reviewIds.owner],
    );
    // Fixture state in a marked isolated database, never an approval of a real person's licence.
    await manager.query(
      `INSERT INTO kpa_pharmacist_profiles
      (user_id,license_number,license_verified,verified_at,verified_by,qualification_status,qualification_reason)
      VALUES($1,'SYNTHETIC-NOT-A-LICENSE',true,now(),$2,'approved',
      'Isolated review fixture only. No real professional qualification was verified or approved.')`,
      [reviewIds.owner, reviewIds.fixtureActor],
    );
    await manager.query(
      `INSERT INTO store_local_products(id,organization_id,name,description,summary)
      VALUES($1,$2,'심사용 매장 안내판','비의약품 합성 상품. 매장 안내를 위한 예시이며 실제 판매하지 않습니다.','합성 안내판')`,
      [reviewIds.product, reviewIds.store],
    );
    await manager.query(
      `INSERT INTO store_execution_assets
      (id,organization_id,title,description,asset_type,html_content,source_type)
      VALUES($1,$2,'심사용 매장 이용 안내','합성 참고 자료','content',
      '<p>자료는 비공개 초안으로 저장합니다. 게시 전 O4O에서 검토합니다. 환자·고객 개인정보는 포함하지 않습니다.</p>','uploaded')`,
      [reviewIds.material, reviewIds.store],
    );
    const settings = structuredClone(defaultSettings);
    settings.enabled = true;
    settings.chatgptEnabled = true;
    for (const kind of Object.keys(settings.targets) as Array<
      keyof typeof settings.targets
    >)
      settings.targets[kind] = {
        read: kind === "store",
        write: kind === "store",
      };
    await manager.query(
      `INSERT INTO external_ai_settings(id,settings) VALUES(1,$1)
      ON CONFLICT(id) DO UPDATE SET settings=EXCLUDED.settings,revision=external_ai_settings.revision+1`,
      [settings],
    );
    await manager.query(
      "COMMENT ON DATABASE o4o_chatgpt_review_demo IS 'chatgpt-review-synthetic-only-v1:prepared-v1'",
    );
    return {
      state: "prepared",
      writes: true,
      userCount: 2,
      storeCount: 1,
      productCount: 1,
      materialCount: 1,
    };
  });
}
