import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GlycoPharm pharmacy role 통일: glycopharm:pharmacy → pharmacy
 *
 * 기존 마이그레이션(20260326)이 pharmacy → glycopharm:pharmacy로 변환했으나,
 * 신규 가입자는 pharmacy로 저장되어 불일치 발생.
 * pharmacy를 정규 role로 확정하고, glycopharm:pharmacy를 pharmacy로 되돌린다.
 *
 * 또한 seller(기존 GlycoPharm 약국 가입 시 사용)도 pharmacy로 통일.
 */
export class UnifyGlycopharmPharmacyRole1711878800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. role_assignments: glycopharm:pharmacy → pharmacy
    const ra1 = await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'pharmacy', updated_at = NOW()
      WHERE role = 'glycopharm:pharmacy' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: glycopharm:pharmacy → pharmacy (${ra1[1] ?? 0} rows)`);

    // 2. role_assignments: glycopharm:pharmacist → pharmacy
    const ra2 = await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'pharmacy', updated_at = NOW()
      WHERE role = 'glycopharm:pharmacist' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: glycopharm:pharmacist → pharmacy (${ra2[1] ?? 0} rows)`);

    // 3. service_memberships: glycopharm:pharmacy → pharmacy (glycopharm only)
    const sm1 = await queryRunner.query(`
      UPDATE service_memberships
      SET role = 'pharmacy', updated_at = NOW()
      WHERE role = 'glycopharm:pharmacy' AND service_key = 'glycopharm'
    `);
    console.log(`[Migration] service_memberships: glycopharm:pharmacy → pharmacy (${sm1[1] ?? 0} rows)`);

    // 4. service_memberships: glycopharm:pharmacist → pharmacy (glycopharm only)
    const sm2 = await queryRunner.query(`
      UPDATE service_memberships
      SET role = 'pharmacy', updated_at = NOW()
      WHERE role = 'glycopharm:pharmacist' AND service_key = 'glycopharm'
    `);
    console.log(`[Migration] service_memberships: glycopharm:pharmacist → pharmacy (${sm2[1] ?? 0} rows)`);

    // 5. seller → pharmacy (from earlier migration 20260331200000, ensure consistency)
    const ra3 = await queryRunner.query(`
      UPDATE role_assignments ra
      SET role = 'pharmacy', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id
        AND sm.service_key = 'glycopharm'
        AND ra.role = 'seller'
        AND ra.is_active = true
    `);
    console.log(`[Migration] role_assignments: seller → pharmacy for glycopharm (${ra3[1] ?? 0} rows)`);

    const sm3 = await queryRunner.query(`
      UPDATE service_memberships
      SET role = 'pharmacy', updated_at = NOW()
      WHERE role = 'seller' AND service_key = 'glycopharm'
    `);
    console.log(`[Migration] service_memberships: seller → pharmacy for glycopharm (${sm3[1] ?? 0} rows)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: pharmacy → glycopharm:pharmacy (glycopharm members only)
    await queryRunner.query(`
      UPDATE role_assignments ra
      SET role = 'glycopharm:pharmacy', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id
        AND sm.service_key = 'glycopharm'
        AND ra.role = 'pharmacy'
        AND ra.is_active = true
    `);
    await queryRunner.query(`
      UPDATE service_memberships
      SET role = 'glycopharm:pharmacy', updated_at = NOW()
      WHERE role = 'pharmacy' AND service_key = 'glycopharm'
    `);
  }
}
