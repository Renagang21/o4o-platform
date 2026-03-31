import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GlycoPharm roles 카탈로그 통일
 *
 * 이전 마이그레이션(20260331100000~300000)이 role_assignments / service_memberships를
 * unprefixed(pharmacy, customer)로 통일했으나, roles 카탈로그 테이블은 prefixed
 * (glycopharm:pharmacy 등) 그대로 남아 있었다.
 *
 * assignMemberRole()이 roles 테이블로 검증하므로, 프론트가 unprefixed role을
 * 보내면 400 "Invalid role" 발생.
 *
 * 이 마이그레이션은:
 * 1. roles 카탈로그: glycopharm 사용자 역할을 unprefixed로 rename
 * 2. role_assignments: 남아있는 glycopharm:supplier, glycopharm:partner도 unprefixed로 통일
 * 3. service_memberships: 동일
 *
 * admin/operator 역할은 prefixed 유지 (glycopharm:admin, glycopharm:operator)
 */
export class UnifyGlycopharmRolesCatalog1711882400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. roles 카탈로그 테이블 ──
    // glycopharm:pharmacy → pharmacy
    const r1 = await queryRunner.query(`
      UPDATE roles SET name = 'pharmacy', role_key = 'pharmacy', updated_at = NOW()
      WHERE name = 'glycopharm:pharmacy'
        AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'pharmacy')
    `);
    console.log(`[Migration] roles catalog: glycopharm:pharmacy → pharmacy (${r1[1] ?? 0} rows)`);

    // glycopharm:consumer → customer (코드 전반에서 customer 사용)
    const r2 = await queryRunner.query(`
      UPDATE roles SET name = 'customer', role_key = 'customer', display_name = 'Customer',
             description = 'Customer/patient', updated_at = NOW()
      WHERE name = 'glycopharm:consumer'
        AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'customer')
    `);
    console.log(`[Migration] roles catalog: glycopharm:consumer → customer (${r2[1] ?? 0} rows)`);

    // glycopharm:supplier → supplier
    const r3 = await queryRunner.query(`
      UPDATE roles SET name = 'supplier', role_key = 'supplier', display_name = 'Supplier',
             description = 'Supplier', updated_at = NOW()
      WHERE name = 'glycopharm:supplier'
        AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'supplier')
    `);
    console.log(`[Migration] roles catalog: glycopharm:supplier → supplier (${r3[1] ?? 0} rows)`);

    // glycopharm:partner → partner
    const r4 = await queryRunner.query(`
      UPDATE roles SET name = 'partner', role_key = 'partner', display_name = 'Partner',
             description = 'Partner', updated_at = NOW()
      WHERE name = 'glycopharm:partner'
        AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'partner')
    `);
    console.log(`[Migration] roles catalog: glycopharm:partner → partner (${r4[1] ?? 0} rows)`);

    // ── 2. role_assignments: 남은 prefixed → unprefixed ──
    const ra1 = await queryRunner.query(`
      UPDATE role_assignments SET role = 'supplier', updated_at = NOW()
      WHERE role = 'glycopharm:supplier' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: glycopharm:supplier → supplier (${ra1[1] ?? 0} rows)`);

    const ra2 = await queryRunner.query(`
      UPDATE role_assignments SET role = 'partner', updated_at = NOW()
      WHERE role = 'glycopharm:partner' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: glycopharm:partner → partner (${ra2[1] ?? 0} rows)`);

    const ra3 = await queryRunner.query(`
      UPDATE role_assignments SET role = 'customer', updated_at = NOW()
      WHERE role = 'glycopharm:consumer' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: glycopharm:consumer → customer (${ra3[1] ?? 0} rows)`);

    // ── 3. service_memberships: 남은 prefixed → unprefixed ──
    const sm1 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'supplier', updated_at = NOW()
      WHERE role = 'glycopharm:supplier' AND service_key = 'glycopharm'
    `);
    console.log(`[Migration] service_memberships: glycopharm:supplier → supplier (${sm1[1] ?? 0} rows)`);

    const sm2 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'partner', updated_at = NOW()
      WHERE role = 'glycopharm:partner' AND service_key = 'glycopharm'
    `);
    console.log(`[Migration] service_memberships: glycopharm:partner → partner (${sm2[1] ?? 0} rows)`);

    const sm3 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'customer', updated_at = NOW()
      WHERE role = 'glycopharm:consumer' AND service_key = 'glycopharm'
    `);
    console.log(`[Migration] service_memberships: glycopharm:consumer → customer (${sm3[1] ?? 0} rows)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // roles 카탈로그 복원
    await queryRunner.query(`UPDATE roles SET name = 'glycopharm:pharmacy', role_key = 'pharmacy', updated_at = NOW() WHERE name = 'pharmacy' AND service_key = 'glycopharm'`);
    await queryRunner.query(`UPDATE roles SET name = 'glycopharm:consumer', role_key = 'consumer', display_name = 'Consumer', updated_at = NOW() WHERE name = 'customer' AND service_key = 'glycopharm'`);
    await queryRunner.query(`UPDATE roles SET name = 'glycopharm:supplier', role_key = 'supplier', display_name = 'GlycoPharm Supplier', updated_at = NOW() WHERE name = 'supplier' AND service_key = 'glycopharm'`);
    await queryRunner.query(`UPDATE roles SET name = 'glycopharm:partner', role_key = 'partner', display_name = 'GlycoPharm Partner', updated_at = NOW() WHERE name = 'partner' AND service_key = 'glycopharm'`);

    // role_assignments 복원
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'glycopharm:supplier', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'glycopharm' AND ra.role = 'supplier' AND ra.is_active = true
    `);
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'glycopharm:partner', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'glycopharm' AND ra.role = 'partner' AND ra.is_active = true
    `);
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'glycopharm:consumer', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'glycopharm' AND ra.role = 'customer' AND ra.is_active = true
    `);

    // service_memberships 복원
    await queryRunner.query(`UPDATE service_memberships SET role = 'glycopharm:supplier', updated_at = NOW() WHERE role = 'supplier' AND service_key = 'glycopharm'`);
    await queryRunner.query(`UPDATE service_memberships SET role = 'glycopharm:partner', updated_at = NOW() WHERE role = 'partner' AND service_key = 'glycopharm'`);
    await queryRunner.query(`UPDATE service_memberships SET role = 'glycopharm:consumer', updated_at = NOW() WHERE role = 'customer' AND service_key = 'glycopharm'`);
  }
}
