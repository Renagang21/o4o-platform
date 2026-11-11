import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SOCIAL-SIGNUP-DIRECT-ROLE-REGISTRATION-V1 T2 — 소셜 가입은 이메일 없이 계정을 만든다(S1 · S2).
 *
 * 카카오가 이메일을 주지 않거나 확인하지 않은 경우 users.email 을 비워 둔다. UNIQUE 는 그대로다 —
 * PostgreSQL UNIQUE 는 NULL 을 여러 개 허용하므로, 이메일이 있는 계정끼리의 중복 차단은 바뀌지 않는다.
 * 기존 행은 바꾸지 않는다.
 */
export class AllowUsersWithoutEmail1794357598911 implements MigrationInterface {
  name = 'AllowUsersWithoutEmail1794357598911';

  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE users ALTER COLUMN email DROP NOT NULL');
  }

  async down(q: QueryRunner): Promise<void> {
    // 이메일 없는 계정에 값을 지어내 채우지 않는다 — 그런 계정이 있으면 되돌리기 전에 검토한다.
    const [row] = await q.query('SELECT EXISTS(SELECT 1 FROM users WHERE email IS NULL) AS missing');
    if (row.missing) throw new Error('USERS_WITHOUT_EMAIL_REQUIRE_REVIEW');
    await q.query('ALTER TABLE users ALTER COLUMN email SET NOT NULL');
  }
}
