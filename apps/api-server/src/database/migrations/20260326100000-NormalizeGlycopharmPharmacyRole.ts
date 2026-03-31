import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ⚠️ SUPERSEDED by 20260331300000-UnifyGlycopharmPharmacyRole
 *
 * 이 마이그레이션은 pharmacy → glycopharm:pharmacy 변환을 수행했으나,
 * 20260331300000에서 glycopharm:pharmacy → pharmacy로 되돌림.
 * 정규 role은 'pharmacy' (비접두어).
 *
 * [원래 설명]
 * role_assignments에 접두어 없이 저장된 'pharmacy' → 'glycopharm:pharmacy' 정규화.
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
