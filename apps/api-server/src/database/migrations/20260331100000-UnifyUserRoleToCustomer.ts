import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 당뇨인 role 통일: 'user' → 'customer'
 *
 * GlucoseView 가입 시 'user', GlycoPharm 가입 시 'customer'로
 * 분리 저장되던 것을 'customer' 하나로 통일한다.
 */
export class UnifyUserRoleToCustomer1711871600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. role_assignments: user → customer
    const raResult = await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'customer', updated_at = NOW()
      WHERE role = 'user' AND is_active = true
    `);
    console.log(`[Migration] role_assignments: user → customer (${raResult[1] ?? 0} rows)`);

    // 2. service_memberships: user → customer
    const smResult = await queryRunner.query(`
      UPDATE service_memberships
      SET role = 'customer', updated_at = NOW()
      WHERE role = 'user'
    `);
    console.log(`[Migration] service_memberships: user → customer (${smResult[1] ?? 0} rows)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: customer → user (glucoseview only)
    await queryRunner.query(`
      UPDATE role_assignments ra
      SET role = 'user', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id
        AND sm.service_key = 'glucoseview'
        AND ra.role = 'customer'
        AND ra.is_active = true
    `);

    await queryRunner.query(`
      UPDATE service_memberships
      SET role = 'user', updated_at = NOW()
      WHERE role = 'customer' AND service_key = 'glucoseview'
    `);
  }
}
