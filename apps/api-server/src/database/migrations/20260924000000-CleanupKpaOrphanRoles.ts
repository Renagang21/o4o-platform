import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-ORPHAN-ROLE-CLEANUP-V1
 *
 * sohae21@naver.com 계정은 kpa_members 레코드 없이 kpa:store_owner role만
 * role_assignments에 남아 있는 orphan 권한 상태.
 *
 * 처리:
 *   - kpa:store_owner role 제거 (role_assignments)
 *   - kpa:pharmacist 등 기타 KPA role도 동일 패턴으로 제거
 *   - users 계정 / neture membership / glycopharm membership 유지
 *   - kpa-society service_membership(pending) 유지
 *
 * Orphan 정의: kpa_members 레코드가 없는 사용자의 kpa:* role
 */
export class CleanupKpaOrphanRoles20260924000000 implements MigrationInterface {
  name = 'CleanupKpaOrphanRoles20260924000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 제거 대상 확인 (감사 로그용)
    const orphans = await queryRunner.query(`
      SELECT u.email, ra.role, ra.id AS ra_id
      FROM role_assignments ra
      JOIN users u ON u.id = ra.user_id
      WHERE ra.role LIKE 'kpa:%'
        AND ra.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM kpa_members km WHERE km.user_id = ra.user_id
        )
      ORDER BY u.email, ra.role
    `);

    if (orphans.length === 0) {
      console.log('[CleanupKpaOrphanRoles] No orphan KPA roles found. Nothing to do.');
      return;
    }

    console.log(`[CleanupKpaOrphanRoles] Found ${orphans.length} orphan KPA role(s):`);
    for (const row of orphans) {
      console.log(`  - ${row.email}: ${row.role} (ra_id: ${row.ra_id})`);
    }

    // 2. orphan KPA role 일괄 제거 (soft delete: is_active = false)
    const result = await queryRunner.query(`
      UPDATE role_assignments ra
      SET is_active = false,
          updated_at = NOW()
      WHERE ra.role LIKE 'kpa:%'
        AND ra.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM kpa_members km WHERE km.user_id = ra.user_id
        )
    `);

    console.log(`[CleanupKpaOrphanRoles] Deactivated ${orphans.length} orphan KPA role(s).`);

    // 3. 검증
    const remaining = await queryRunner.query(`
      SELECT u.email, ra.role
      FROM role_assignments ra
      JOIN users u ON u.id = ra.user_id
      WHERE ra.role LIKE 'kpa:%'
        AND ra.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM kpa_members km WHERE km.user_id = ra.user_id
        )
    `);

    if (remaining.length > 0) {
      throw new Error(`[CleanupKpaOrphanRoles] Validation failed: ${remaining.length} orphan roles still active`);
    }

    console.log('[CleanupKpaOrphanRoles] ✅ Validation passed: no orphan KPA roles remain.');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 특정 사용자의 특정 role을 복원하는 것은 재현 불가 (원본 assigned_by 정보 없음)
    // rollback 필요 시 수동 처리
    console.log('[CleanupKpaOrphanRoles] down: no-op (manual rollback required if needed)');
  }
}
