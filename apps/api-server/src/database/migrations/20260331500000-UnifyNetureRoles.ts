import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Neture role_assignments unprefixed 통일
 *
 * WO-NETURE-ROLE-NORMALIZATION-V1
 *
 * GlycoPharm과 동일한 패턴:
 * - role_assignments: neture:supplier → supplier, neture:partner → partner 등
 * - service_memberships: 이미 unprefixed (supplier, partner, seller) — 확인만
 * - roles 카탈로그: 변경하지 않음 (unique constraint 충돌 방지 — GlycoPharm이 supplier/partner 점유)
 *
 * admin/operator 역할은 prefixed 유지 (neture:admin, neture:operator)
 * → serviceScope 추출에 prefix가 필수
 */
export class UnifyNetureRoles20260331500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[Migration] UnifyNetureRoles — START');

    // ── 1. role_assignments: prefixed → unprefixed ──
    // service_memberships JOIN으로 Neture 사용자만 대상

    const ra1 = await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'supplier', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'neture'
        AND ra.role = 'neture:supplier' AND ra.is_active = true
    `);
    console.log(`[Migration] role_assignments: neture:supplier → supplier (${ra1[1] ?? 0} rows)`);

    const ra2 = await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'partner', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'neture'
        AND ra.role = 'neture:partner' AND ra.is_active = true
    `);
    console.log(`[Migration] role_assignments: neture:partner → partner (${ra2[1] ?? 0} rows)`);

    const ra3 = await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'seller', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'neture'
        AND ra.role = 'neture:seller' AND ra.is_active = true
    `);
    console.log(`[Migration] role_assignments: neture:seller → seller (${ra3[1] ?? 0} rows)`);

    const ra4 = await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'user', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'neture'
        AND ra.role = 'neture:user' AND ra.is_active = true
    `);
    console.log(`[Migration] role_assignments: neture:user → user (${ra4[1] ?? 0} rows)`);

    // ── 2. service_memberships: 혹시 prefixed가 남아있다면 정리 ──
    const sm1 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'supplier', updated_at = NOW()
      WHERE role = 'neture:supplier' AND service_key = 'neture'
    `);
    console.log(`[Migration] service_memberships: neture:supplier → supplier (${sm1[1] ?? 0} rows)`);

    const sm2 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'partner', updated_at = NOW()
      WHERE role = 'neture:partner' AND service_key = 'neture'
    `);
    console.log(`[Migration] service_memberships: neture:partner → partner (${sm2[1] ?? 0} rows)`);

    const sm3 = await queryRunner.query(`
      UPDATE service_memberships SET role = 'seller', updated_at = NOW()
      WHERE role = 'neture:seller' AND service_key = 'neture'
    `);
    console.log(`[Migration] service_memberships: neture:seller → seller (${sm3[1] ?? 0} rows)`);

    console.log('[Migration] UnifyNetureRoles — DONE');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // role_assignments 복원
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'neture:supplier', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'neture'
        AND ra.role = 'supplier' AND ra.is_active = true
    `);
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'neture:partner', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'neture'
        AND ra.role = 'partner' AND ra.is_active = true
    `);
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'neture:seller', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'neture'
        AND ra.role = 'seller' AND ra.is_active = true
    `);

    // service_memberships 복원
    await queryRunner.query(`UPDATE service_memberships SET role = 'neture:supplier', updated_at = NOW() WHERE role = 'supplier' AND service_key = 'neture'`);
    await queryRunner.query(`UPDATE service_memberships SET role = 'neture:partner', updated_at = NOW() WHERE role = 'partner' AND service_key = 'neture'`);
    await queryRunner.query(`UPDATE service_memberships SET role = 'neture:seller', updated_at = NOW() WHERE role = 'seller' AND service_key = 'neture'`);
  }
}
