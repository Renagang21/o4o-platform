import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * K-Cosmetics roles 카탈로그 통일
 *
 * GlycoPharm(20260331400000)과 동일한 문제:
 * - 가입 시 unprefixed(seller, consumer)로 저장
 * - roles 카탈로그엔 prefixed(cosmetics:seller)만 존재
 * - assignMemberRole()이 roles 카탈로그로 검증 → 400 "Invalid role"
 *
 * 이 마이그레이션은:
 * 1. roles 카탈로그: cosmetics 사용자 역할을 unprefixed로 rename
 * 2. role_assignments: 남아있는 prefixed → unprefixed 통일
 * 3. service_memberships: 동일
 *
 * admin/operator 역할은 prefixed 유지 (cosmetics:admin, cosmetics:operator)
 */
export class UnifyCosmeticsRolesCatalog1711886000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. roles 카탈로그 테이블 ──
    // cosmetics:seller → seller (가입 시 'seller'로 저장)
    const r1 = await queryRunner.query(`
      UPDATE roles SET name = 'seller', role_key = 'seller', display_name = 'Seller',
             updated_at = NOW()
      WHERE name = 'cosmetics:seller'
        AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'seller')
    `);
    console.log(`[Migration] roles catalog: cosmetics:seller → seller (${r1[1] ?? 0} rows)`);

    // cosmetics:user → consumer (가입 시 'consumer'로 저장)
    const r2 = await queryRunner.query(`
      UPDATE roles SET name = 'consumer', role_key = 'consumer', display_name = 'Consumer',
             description = 'Consumer', updated_at = NOW()
      WHERE name = 'cosmetics:user'
        AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'consumer')
    `);
    console.log(`[Migration] roles catalog: cosmetics:user → consumer (${r2[1] ?? 0} rows)`);

    // cosmetics:supplier → supplier
    // 주의: glycopharm 마이그레이션(20260331400000)에서 이미 'supplier'로 rename 했을 수 있음
    const r3 = await queryRunner.query(`
      UPDATE roles SET name = 'supplier', role_key = 'supplier', display_name = 'Supplier',
             updated_at = NOW()
      WHERE name = 'cosmetics:supplier'
        AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'supplier')
    `);
    console.log(`[Migration] roles catalog: cosmetics:supplier → supplier (${r3[1] ?? 0} rows)`);

    // cosmetics:pharmacist → pharmacist
    const r4 = await queryRunner.query(`
      UPDATE roles SET name = 'pharmacist', role_key = 'pharmacist', display_name = 'Pharmacist',
             updated_at = NOW()
      WHERE name = 'cosmetics:pharmacist'
        AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'pharmacist')
    `);
    console.log(`[Migration] roles catalog: cosmetics:pharmacist → pharmacist (${r4[1] ?? 0} rows)`);

    // cosmetics:partner → partner
    // 주의: glycopharm 마이그레이션에서 이미 'partner'로 rename 했을 수 있음
    const r5 = await queryRunner.query(`
      UPDATE roles SET name = 'partner', role_key = 'partner', display_name = 'Partner',
             updated_at = NOW()
      WHERE name = 'cosmetics:partner'
        AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'partner')
    `);
    console.log(`[Migration] roles catalog: cosmetics:partner → partner (${r5[1] ?? 0} rows)`);

    // ── 2. role_assignments: prefixed → unprefixed ──
    const ra1 = await queryRunner.query(`
      UPDATE role_assignments SET role = 'seller', updated_at = NOW()
      WHERE role = 'cosmetics:seller' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: cosmetics:seller → seller (${ra1[1] ?? 0} rows)`);

    const ra2 = await queryRunner.query(`
      UPDATE role_assignments SET role = 'consumer', updated_at = NOW()
      WHERE role = 'cosmetics:user' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: cosmetics:user → consumer (${ra2[1] ?? 0} rows)`);

    const ra3 = await queryRunner.query(`
      UPDATE role_assignments SET role = 'supplier', updated_at = NOW()
      WHERE role = 'cosmetics:supplier' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: cosmetics:supplier → supplier (${ra3[1] ?? 0} rows)`);

    const ra4 = await queryRunner.query(`
      UPDATE role_assignments SET role = 'pharmacist', updated_at = NOW()
      WHERE role = 'cosmetics:pharmacist' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: cosmetics:pharmacist → pharmacist (${ra4[1] ?? 0} rows)`);

    const ra5 = await queryRunner.query(`
      UPDATE role_assignments SET role = 'partner', updated_at = NOW()
      WHERE role = 'cosmetics:partner' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: cosmetics:partner → partner (${ra5[1] ?? 0} rows)`);

    // ── 3. service_memberships: prefixed → unprefixed ──
    const sm1 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'seller', updated_at = NOW()
      WHERE role = 'cosmetics:seller' AND service_key = 'k-cosmetics'
    `);
    console.log(`[Migration] service_memberships: cosmetics:seller → seller (${sm1[1] ?? 0} rows)`);

    const sm2 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'consumer', updated_at = NOW()
      WHERE role = 'cosmetics:user' AND service_key = 'k-cosmetics'
    `);
    console.log(`[Migration] service_memberships: cosmetics:user → consumer (${sm2[1] ?? 0} rows)`);

    const sm3 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'supplier', updated_at = NOW()
      WHERE role = 'cosmetics:supplier' AND service_key = 'k-cosmetics'
    `);
    console.log(`[Migration] service_memberships: cosmetics:supplier → supplier (${sm3[1] ?? 0} rows)`);

    const sm4 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'pharmacist', updated_at = NOW()
      WHERE role = 'cosmetics:pharmacist' AND service_key = 'k-cosmetics'
    `);
    console.log(`[Migration] service_memberships: cosmetics:pharmacist → pharmacist (${sm4[1] ?? 0} rows)`);

    const sm5 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'partner', updated_at = NOW()
      WHERE role = 'cosmetics:partner' AND service_key = 'k-cosmetics'
    `);
    console.log(`[Migration] service_memberships: cosmetics:partner → partner (${sm5[1] ?? 0} rows)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // roles 카탈로그 복원
    await queryRunner.query(`UPDATE roles SET name = 'cosmetics:seller', role_key = 'seller', updated_at = NOW() WHERE name = 'seller' AND service_key = 'cosmetics'`);
    await queryRunner.query(`UPDATE roles SET name = 'cosmetics:user', role_key = 'user', updated_at = NOW() WHERE name = 'consumer' AND service_key = 'cosmetics'`);
    await queryRunner.query(`UPDATE roles SET name = 'cosmetics:supplier', role_key = 'supplier', updated_at = NOW() WHERE name = 'supplier' AND service_key = 'cosmetics'`);
    await queryRunner.query(`UPDATE roles SET name = 'cosmetics:pharmacist', role_key = 'pharmacist', updated_at = NOW() WHERE name = 'pharmacist' AND service_key = 'cosmetics'`);
    await queryRunner.query(`UPDATE roles SET name = 'cosmetics:partner', role_key = 'partner', updated_at = NOW() WHERE name = 'partner' AND service_key = 'cosmetics'`);

    // role_assignments 복원
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'cosmetics:seller', updated_at = NOW()
      FROM service_memberships sm WHERE sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics' AND ra.role = 'seller' AND ra.is_active = true
    `);
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'cosmetics:user', updated_at = NOW()
      FROM service_memberships sm WHERE sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics' AND ra.role = 'consumer' AND ra.is_active = true
    `);
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'cosmetics:supplier', updated_at = NOW()
      FROM service_memberships sm WHERE sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics' AND ra.role = 'supplier' AND ra.is_active = true
    `);
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'cosmetics:pharmacist', updated_at = NOW()
      FROM service_memberships sm WHERE sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics' AND ra.role = 'pharmacist' AND ra.is_active = true
    `);
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'cosmetics:partner', updated_at = NOW()
      FROM service_memberships sm WHERE sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics' AND ra.role = 'partner' AND ra.is_active = true
    `);

    // service_memberships 복원
    await queryRunner.query(`UPDATE service_memberships SET role = 'cosmetics:seller', updated_at = NOW() WHERE role = 'seller' AND service_key = 'k-cosmetics'`);
    await queryRunner.query(`UPDATE service_memberships SET role = 'cosmetics:user', updated_at = NOW() WHERE role = 'consumer' AND service_key = 'k-cosmetics'`);
    await queryRunner.query(`UPDATE service_memberships SET role = 'cosmetics:supplier', updated_at = NOW() WHERE role = 'supplier' AND service_key = 'k-cosmetics'`);
    await queryRunner.query(`UPDATE service_memberships SET role = 'cosmetics:pharmacist', updated_at = NOW() WHERE role = 'pharmacist' AND service_key = 'k-cosmetics'`);
    await queryRunner.query(`UPDATE service_memberships SET role = 'cosmetics:partner', updated_at = NOW() WHERE role = 'partner' AND service_key = 'k-cosmetics'`);
  }
}
