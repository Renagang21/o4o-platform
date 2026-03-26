import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-RBAC-ROLE-PREFIX-NORMALIZATION-V1
 *
 * role_assignments에 접두어 없이 저장된 'pharmacy' → 'glycopharm:pharmacy' 정규화.
 *
 * 배경:
 * - 시드 코드(seed-test-accounts.ts)에서 assignedRole: 'pharmacy' 로 잘못 저장
 * - 프론트엔드 GLYCOPHARM_ROLES.PHARMACY = 'glycopharm:pharmacy' 기대
 * - 백엔드 security-core도 service prefix 기반 설계
 * - SoftGuardOutlet에서 role mismatch → /care 접근 실패
 *
 * 안전장치:
 * - service_memberships JOIN으로 glycopharm 서비스 사용자만 대상
 * - DRY RUN 카운트 먼저 출력
 */
export class NormalizeGlycopharmPharmacyRole20260326100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Dry run — count affected rows
    const countResult = await queryRunner.query(`
      SELECT COUNT(*)::int AS cnt
      FROM role_assignments ra
      WHERE ra.role = 'pharmacy'
        AND ra.is_active = true
        AND EXISTS (
          SELECT 1 FROM service_memberships sm
          WHERE sm.user_id = ra.user_id
            AND sm.service_key = 'glycopharm'
            AND sm.status = 'active'
        )
    `);
    const cnt = countResult[0]?.cnt ?? 0;
    console.warn(`[Migration] NormalizeGlycopharmPharmacyRole: ${cnt} rows to update`);

    if (cnt === 0) {
      console.warn('[Migration] No rows to update — skipping');
      return;
    }

    // Step 2: Update pharmacy → glycopharm:pharmacy (glycopharm members only)
    const updateResult = await queryRunner.query(`
      UPDATE role_assignments ra
      SET role = 'glycopharm:pharmacy', updated_at = NOW()
      WHERE ra.role = 'pharmacy'
        AND ra.is_active = true
        AND EXISTS (
          SELECT 1 FROM service_memberships sm
          WHERE sm.user_id = ra.user_id
            AND sm.service_key = 'glycopharm'
            AND sm.status = 'active'
        )
    `);
    console.warn(`[Migration] Updated ${updateResult[1] ?? cnt} rows: pharmacy → glycopharm:pharmacy`);

    // Step 3: Verify — no unprefixed 'pharmacy' left for glycopharm members
    const verifyResult = await queryRunner.query(`
      SELECT COUNT(*)::int AS remaining
      FROM role_assignments ra
      WHERE ra.role = 'pharmacy'
        AND ra.is_active = true
        AND EXISTS (
          SELECT 1 FROM service_memberships sm
          WHERE sm.user_id = ra.user_id
            AND sm.service_key = 'glycopharm'
            AND sm.status = 'active'
        )
    `);
    const remaining = verifyResult[0]?.remaining ?? 0;
    if (remaining > 0) {
      console.warn(`[Migration] WARNING: ${remaining} rows still have unprefixed 'pharmacy'`);
    } else {
      console.warn('[Migration] Verification passed: 0 unprefixed pharmacy roles for glycopharm members');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: glycopharm:pharmacy → pharmacy (glycopharm members only)
    await queryRunner.query(`
      UPDATE role_assignments ra
      SET role = 'pharmacy', updated_at = NOW()
      WHERE ra.role = 'glycopharm:pharmacy'
        AND ra.is_active = true
        AND EXISTS (
          SELECT 1 FROM service_memberships sm
          WHERE sm.user_id = ra.user_id
            AND sm.service_key = 'glycopharm'
            AND sm.status = 'active'
        )
    `);
    console.warn('[Migration] Rolled back: glycopharm:pharmacy → pharmacy');
  }
}
