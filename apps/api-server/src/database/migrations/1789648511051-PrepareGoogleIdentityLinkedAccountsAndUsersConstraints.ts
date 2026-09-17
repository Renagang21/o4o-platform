import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1 (Identity V3 Phase 2-A · F10 auth-core 명시적 예외)
 * 근거: O4O-IDENTITY-ARCHITECTURE-V3 §2 · §3 · REVIEW-8 / IR-O4O-GOOGLE-IDENTITY-MIGRATION-EXECUTION-PLAN-V1 §3 · §8
 *
 * Google Identity 를 받을 수 있는 **토대만** 만든다. Google 로그인/가입/연결 runtime 은 만들지 않는다.
 *
 * linked_accounts (Google `sub` Identity 저장소로 재사용 · 운영 0행 실측 2026-09-17)
 *   - FK "userId" → users(id) ON DELETE CASCADE           (운영에 FK 없음)
 *   - UNIQUE (provider, "providerId") WHERE "providerId" IS NOT NULL   → 1 Google sub = 1 O4O user
 *   - UNIQUE ("userId") WHERE provider = 'google'                      → 1 O4O user = 1 Google sub
 *   기존 non-unique IDX_linked_accounts_provider / IDX_linked_accounts_user · 컬럼 · provider varchar 는 그대로 둔다.
 *
 * users (Google-only 계정 성립을 막는 제약만 완화 · 값 변경 0)
 *   - password DROP NOT NULL     (Google-only user = NULL. 기존 hash 값은 건드리지 않는다)
 *   - name     DROP NOT NULL · DROP DEFAULT '운영자'   (placeholder 개인정보 생성 금지)
 *   email NOT NULL UNIQUE 은 Phase 5 (본 migration 범위 밖).
 *
 * 하지 않는 것: linking_sessions 생성(WO-2E) · users.password 값 변경 · service_credentials · refresh_tokens ·
 *   linked_accounts 컬럼 삭제 · users.provider/provider_id 삭제.
 */
export class PrepareGoogleIdentityLinkedAccountsAndUsersConstraints1789648511051 implements MigrationInterface {
  name = 'PrepareGoogleIdentityLinkedAccountsAndUsersConstraints1789648511051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 안전 가드: FK/unique 를 만들기 전 orphan · 중복을 count-only 로 확인한다 (운영 0행 기대 · 개인정보 미조회)
    const [{ orphans }] = await queryRunner.query(
      `SELECT count(*)::int AS orphans FROM linked_accounts la LEFT JOIN users u ON u.id = la."userId" WHERE u.id IS NULL`,
    );
    const [{ dup_sub }] = await queryRunner.query(
      `SELECT count(*)::int AS dup_sub FROM (SELECT 1 FROM linked_accounts WHERE "providerId" IS NOT NULL GROUP BY provider, "providerId" HAVING count(*) > 1) d`,
    );
    const [{ dup_google_user }] = await queryRunner.query(
      `SELECT count(*)::int AS dup_google_user FROM (SELECT 1 FROM linked_accounts WHERE provider = 'google' GROUP BY "userId" HAVING count(*) > 1) d`,
    );
    if (orphans > 0 || dup_sub > 0 || dup_google_user > 0) {
      throw new Error(
        `[PrepareGoogleIdentity] refusing to apply: linked_accounts orphans=${orphans} duplicate(provider,providerId)=${dup_sub} duplicate google per user=${dup_google_user} — resolve under an explicit WO first`,
      );
    }

    // linked_accounts.userId → users.id
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_linked_accounts_user') THEN
          ALTER TABLE linked_accounts
            ADD CONSTRAINT "FK_linked_accounts_user"
            FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);

    // 1 Google sub → 1 O4O user (legacy email row 는 providerId NULL 이므로 제외)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_linked_accounts_provider_providerId"
        ON linked_accounts (provider, "providerId")
        WHERE "providerId" IS NOT NULL
    `);

    // 1 O4O user → 1 Google sub
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_linked_accounts_google_user"
        ON linked_accounts ("userId")
        WHERE provider = 'google'
    `);

    // users: Google-only 계정이 성립하도록 제약만 완화 (값 변경 없음)
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN name DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN name DROP DEFAULT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 되돌리기는 NULL 값이 없을 때만 성립한다 (Google-only 계정이 생긴 뒤에는 되돌리지 않는다)
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN name SET DEFAULT '운영자'`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN name SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN password SET NOT NULL`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_linked_accounts_google_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_linked_accounts_provider_providerId"`);
    await queryRunner.query(`ALTER TABLE linked_accounts DROP CONSTRAINT IF EXISTS "FK_linked_accounts_user"`);
  }
}
