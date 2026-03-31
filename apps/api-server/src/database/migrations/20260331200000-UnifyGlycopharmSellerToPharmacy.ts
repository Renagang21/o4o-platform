import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GlycoPharm 약국 role 통일: 'seller' → 'pharmacy'
 *
 * GlycoPharm 서비스에서 약국 가입 시 'seller'로 저장되던 것을
 * 'pharmacy'로 통일한다. (의약품 취급 구분을 위해 seller와 분리)
 *
 * 대상: glycopharm 서비스 멤버십의 seller role만 변경.
 * Neture 등 다른 서비스의 seller는 변경하지 않음.
 */
export class UnifyGlycopharmSellerToPharmacy1711875200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. service_memberships: glycopharm seller → pharmacy
    const smResult = await queryRunner.query(`
      UPDATE service_memberships
      SET role = 'pharmacy', updated_at = NOW()
      WHERE role = 'seller' AND service_key = 'glycopharm'
    `);
    console.log(`[Migration] service_memberships: glycopharm seller → pharmacy (${smResult[1] ?? 0} rows)`);

    // 2. role_assignments: glycopharm seller → pharmacy (해당 사용자만)
    const raResult = await queryRunner.query(`
      UPDATE role_assignments ra
      SET role = 'pharmacy', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id
        AND sm.service_key = 'glycopharm'
        AND ra.role = 'seller'
        AND ra.is_active = true
    `);
    console.log(`[Migration] role_assignments: glycopharm seller → pharmacy (${raResult[1] ?? 0} rows)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE service_memberships
      SET role = 'seller', updated_at = NOW()
      WHERE role = 'pharmacy' AND service_key = 'glycopharm'
    `);

    await queryRunner.query(`
      UPDATE role_assignments ra
      SET role = 'seller', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id
        AND sm.service_key = 'glycopharm'
        AND ra.role = 'pharmacy'
        AND ra.is_active = true
    `);
  }
}
