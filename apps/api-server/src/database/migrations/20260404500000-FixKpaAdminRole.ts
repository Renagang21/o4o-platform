/**
 * Fix KPA admin account role
 *
 * admin-kpa-society@o4o.com should have kpa:admin role but currently has 'customer'.
 * This was originally set by migration 20260228000001-CleanupLegacyRoles but was
 * overwritten at some point.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixKpaAdminRole1712246400000 implements MigrationInterface {
  name = 'FixKpaAdminRole1712246400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix admin-kpa-society role
    const result = await queryRunner.query(
      `UPDATE users SET roles = ARRAY['kpa:admin']::text[]
       WHERE email = 'admin-kpa-society@o4o.com' AND NOT ('kpa:admin' = ANY(roles))`,
    );
    console.log(`[FixKpaAdminRole] admin-kpa-society updated:`, result);

    // Ensure service_membership exists with operator role
    const userId = await queryRunner.query(
      `SELECT id FROM users WHERE email = 'admin-kpa-society@o4o.com'`,
    );
    if (userId.length > 0) {
      const uid = userId[0].id;

      // Upsert service_membership
      const existingSm = await queryRunner.query(
        `SELECT id FROM service_memberships WHERE user_id = $1 AND service_key = 'kpa-society'`,
        [uid],
      );
      if (existingSm.length === 0) {
        await queryRunner.query(
          `INSERT INTO service_memberships (user_id, service_key, status, role, created_at, updated_at)
           VALUES ($1, 'kpa-society', 'active', 'operator', NOW(), NOW())`,
          [uid],
        );
        console.log(`[FixKpaAdminRole] Created kpa-society service_membership for admin`);
      } else {
        await queryRunner.query(
          `UPDATE service_memberships SET role = 'operator', status = 'active' WHERE id = $1`,
          [existingSm[0].id],
        );
        console.log(`[FixKpaAdminRole] Updated kpa-society service_membership for admin`);
      }

      // Upsert role_assignment
      const existingRa = await queryRunner.query(
        `SELECT id FROM role_assignments WHERE user_id = $1 AND role = 'kpa:admin' AND is_active = true`,
        [uid],
      );
      if (existingRa.length === 0) {
        await queryRunner.query(
          `INSERT INTO role_assignments (user_id, role, is_active, scope_type, valid_from, assigned_at, created_at, updated_at)
           VALUES ($1, 'kpa:admin', true, 'global', NOW(), NOW(), NOW(), NOW())`,
          [uid],
        );
        console.log(`[FixKpaAdminRole] Created role_assignment kpa:admin for admin`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET roles = ARRAY['customer']::text[] WHERE email = 'admin-kpa-society@o4o.com'`,
    );
  }
}
