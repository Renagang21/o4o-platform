import type { DataSource } from "typeorm";
import { hasCooperativeOperatorAccess } from "./cooperative-operator-access.js";

/** Explicitly authorized test fixture only. No password changes or platform role grants. */
export async function provisionTestCooperative(
  db: DataSource,
  accounts: { operatorEmail: string; memberEmail: string },
  apply = false,
) {
  const operatorEmail = accounts.operatorEmail.trim().toLowerCase();
  const memberEmail = accounts.memberEmail.trim().toLowerCase();
  if (
    ![operatorEmail, memberEmail].every((email) => validAccountEmail(email)) ||
    operatorEmail === memberEmail
  )
    throw new Error("COOP_TEST_DISTINCT_ACCOUNTS_REQUIRED");
  return await db.transaction(async (m) => {
    await m.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('o4o:provision:coop-test', 0))`,
    );
    const users = await m.query(
      `SELECT id, lower(email) AS email FROM users
      WHERE lower(email) IN ($1,$2) AND status IN ('active','approved') AND "isActive" = true AND "isEmailVerified" = true FOR SHARE`,
      [operatorEmail, memberEmail],
    );
    const operator = users.find(
      (u: { email: string }) => u.email === operatorEmail,
    );
    const member = users.find(
      (u: { email: string }) => u.email === memberEmail,
    );
    if (!operator || !member)
      throw new Error("COOP_TEST_ACTIVE_ACCOUNTS_REQUIRED");
    if (!(await hasCooperativeOperatorAccess(m, operator.id)))
      throw new Error("COOP_TEST_EXISTING_OPERATOR_ROLE_REQUIRED");
    let [business] = await m.query(
      `SELECT id, key, name, organization_id, status FROM semi_franchises WHERE key = 'coop-test' FOR UPDATE`,
    );
    if (
      business &&
      (business.name !== "테스트 협동조합" || business.status !== "active")
    )
      throw new Error("COOP_TEST_BUSINESS_CONFLICT");
    const [existing] = await m.query(
      `SELECT id, semi_franchise_id, status FROM cooperatives WHERE slug = 'test' FOR UPDATE`,
    );
    if (
      existing &&
      (!business ||
        existing.semi_franchise_id !== business.id ||
        existing.status !== "active")
    )
      throw new Error("COOP_TEST_DIRECTORY_CONFLICT");
    const [enrollment] = existing
      ? await m.query(
          `SELECT status FROM cooperative_memberships WHERE cooperative_id=$1 AND user_id=$2 FOR UPDATE`,
          [existing.id, member.id],
        )
      : [];
    if (enrollment && enrollment.status !== "active")
      throw new Error("COOP_TEST_MEMBERSHIP_CONFLICT");
    if (!apply)
      return {
        mode: "dry-run",
        ready: true,
        businessExists: !!business,
        cooperativeExists: !!existing,
        memberExists: !!enrollment,
      };
    if (!business) {
      const [org] =
        await m.query(`INSERT INTO organizations (name, code, type, "isActive", metadata)
        VALUES ('테스트 협동조합 운영','semi-franchise-coop-test','semi_franchise',true,'{}') RETURNING id`);
      [business] = await m.query(
        `INSERT INTO semi_franchises (key,name,organization_id)
        VALUES ('coop-test','테스트 협동조합',$1) RETURNING id`,
        [org.id],
      );
    }
    const [cooperative] = existing
      ? [existing]
      : await m.query(
          `INSERT INTO cooperatives (slug,name,semi_franchise_id,introduction,eligibility_description)
      VALUES ('test','테스트 협동조합',$1,'협동조합 서비스 연결을 확인하는 임시 조합입니다.','테스트 참여를 승인받은 개인') RETURNING id`,
          [business.id],
        );
    await m.query(
      `INSERT INTO semi_franchise_operators (semi_franchise_id,user_id,assigned_by)
      VALUES ($1,$2,$2) ON CONFLICT (semi_franchise_id,user_id) WHERE revoked_at IS NULL DO NOTHING`,
      [business.id, operator.id],
    );
    await m.query(
      `INSERT INTO cooperative_memberships (cooperative_id,user_id,status) VALUES ($1,$2,'active')
      ON CONFLICT (cooperative_id,user_id) DO NOTHING`,
      [cooperative.id, member.id],
    );
    return {
      mode: "apply",
      ready: true,
      businessKey: "coop-test",
      slug: "test",
    };
  });
}

function validAccountEmail(email: string): boolean {
  if (!email || email.length > 255 || /\s/.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0]) return false;
  const dot = parts[1].lastIndexOf(".");
  return dot > 0 && dot < parts[1].length - 1;
}
