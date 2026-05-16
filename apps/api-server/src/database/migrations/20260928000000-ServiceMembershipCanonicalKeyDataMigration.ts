import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SERVICE-MEMBERSHIP-CANONICAL-KEY-DATA-MIGRATION-V1
 *
 * 운영 DB에 남아 있는 legacy service_memberships.service_key='kpa' 1건을
 * canonical key 'kpa-society'로 정리한다.
 *
 * 사전 조사 결과: sohae2100@gmail.com 의 service_key='kpa' row 1건.
 * 동일 user의 service_key='kpa-society' row가 이미 존재하면 충돌이므로 abort.
 *
 * 신규 drift 생성 경로는 WO-O4O-ADMIN-OPERATOR-MEMBERSHIP-CANONICAL-KEY-FIX-V1
 * (commit 2e533fba8, revision o4o-core-api-01684-4jk) 에서 차단됨.
 *
 * 검증 정책:
 *   - 데이터 정합성 확인 (kpa row 0건, target user kpa-society 존재) → 실패 시 throw
 *   - 기타 정보성 검증 (kpa:* role 보유자 누락, cosmetics drift) → log only
 */
export class ServiceMembershipCanonicalKeyDataMigration20260928000000 implements MigrationInterface {
  name = 'ServiceMembershipCanonicalKeyDataMigration20260928000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tag = '[ServiceMembershipCanonicalKeyDataMigration]';

    // 1. 대상 사용자 확인
    const userRows = await queryRunner.query(
      `SELECT id, email FROM users WHERE email = 'sohae2100@gmail.com'`
    );
    if (userRows.length === 0) {
      console.log(`${tag} Target user sohae2100@gmail.com not found. Nothing to do.`);
      return;
    }
    const targetUserId = userRows[0].id;
    console.log(`${tag} Target user: ${userRows[0].email} (${targetUserId})`);

    // 2. legacy row 재확인 (service_key='kpa')
    const legacyRows = await queryRunner.query(
      `SELECT id, user_id, service_key, status, role, created_at, updated_at
       FROM service_memberships
       WHERE service_key = 'kpa' AND user_id = $1`,
      [targetUserId]
    );

    if (legacyRows.length === 0) {
      console.log(`${tag} No legacy kpa row for target user. Nothing to do (already canonical or already cleaned).`);
      return;
    }
    if (legacyRows.length > 1) {
      throw new Error(
        `${tag} Unexpected: ${legacyRows.length} legacy kpa rows for target user. ` +
        `WO scope expects exactly 1 row. Manual investigation required.`
      );
    }
    console.log(`${tag} Legacy row: id=${legacyRows[0].id} status=${legacyRows[0].status} role=${legacyRows[0].role}`);

    // 3. 충돌 후보 확인 — 동일 user의 kpa-society row가 존재하면 abort
    const conflictRows = await queryRunner.query(
      `SELECT id, status, role FROM service_memberships
       WHERE service_key = 'kpa-society' AND user_id = $1`,
      [targetUserId]
    );
    if (conflictRows.length > 0) {
      throw new Error(
        `${tag} Conflict: target user already has ${conflictRows.length} kpa-society row(s). ` +
        `Cannot rename service_key without conflict resolution. Existing: ${JSON.stringify(conflictRows)}`
      );
    }

    // 4. UPDATE
    await queryRunner.query(
      `UPDATE service_memberships
       SET service_key = 'kpa-society', updated_at = NOW()
       WHERE service_key = 'kpa' AND user_id = $1`,
      [targetUserId]
    );
    console.log(`${tag} UPDATE executed for target user.`);

    // 5-A. service_key='kpa' row 0건 확인 (데이터 정합성)
    const remainingKpa = await queryRunner.query(
      `SELECT COUNT(*)::int AS count FROM service_memberships WHERE service_key = 'kpa'`
    );
    if (remainingKpa[0].count !== 0) {
      throw new Error(
        `${tag} Post-check failed: ${remainingKpa[0].count} 'kpa' row(s) still exist. ` +
        `This migration only updates the target user; other drift rows require separate WO.`
      );
    }
    console.log(`${tag} ✅ service_key='kpa' row count = 0`);

    // 5-B. target user의 kpa-society row 존재 확인 (데이터 정합성)
    const verifyTarget = await queryRunner.query(
      `SELECT id, status, role FROM service_memberships
       WHERE service_key = 'kpa-society' AND user_id = $1`,
      [targetUserId]
    );
    if (verifyTarget.length !== 1) {
      throw new Error(
        `${tag} Post-check failed: target user kpa-society row count = ${verifyTarget.length}, expected 1`
      );
    }
    console.log(`${tag} ✅ target user kpa-society row: status=${verifyTarget[0].status} role=${verifyTarget[0].role}`);

    // 5-C. kpa:* active role 보유자 중 kpa-society active membership 누락자 (정보성)
    const orphanRoleHolders = await queryRunner.query(`
      SELECT DISTINCT u.email
      FROM role_assignments ra
      JOIN users u ON u.id = ra.user_id
      WHERE ra.role LIKE 'kpa:%'
        AND ra.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM service_memberships sm
          WHERE sm.user_id = ra.user_id
            AND sm.service_key = 'kpa-society'
            AND sm.status = 'active'
        )
      ORDER BY u.email
    `);
    if (orphanRoleHolders.length > 0) {
      console.log(`${tag} ⚠️  ${orphanRoleHolders.length} kpa:* role holder(s) lack active kpa-society membership:`);
      for (const row of orphanRoleHolders) {
        console.log(`  - ${row.email}`);
      }
      console.log(`${tag} (informational — separate operational concern, migration continues)`);
    } else {
      console.log(`${tag} ✅ No kpa:* role holders missing kpa-society active membership`);
    }

    // 5-D. cosmetics legacy drift (정보성)
    const legacyCosmetics = await queryRunner.query(
      `SELECT COUNT(*)::int AS count FROM service_memberships WHERE service_key = 'cosmetics'`
    );
    if (legacyCosmetics[0].count !== 0) {
      console.log(`${tag} ⚠️  ${legacyCosmetics[0].count} legacy 'cosmetics' row(s) still exist (this WO only handles 'kpa' drift)`);
    } else {
      console.log(`${tag} ✅ No legacy cosmetics drift`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[ServiceMembershipCanonicalKeyDataMigration] down: no-op (data cleanup migrations are not reversible)');
  }
}
