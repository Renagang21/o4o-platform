/**
 * Fix KPA admin account role
 *
 * admin-kpa-society@o4o.com should have kpa:admin role but currently has 'customer'
 * in role_assignments (RBAC SSOT). The users.roles column no longer exists.
 *
 * Ensures: role_assignment kpa:admin + service_membership kpa-society operator
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixKpaAdminRole1712246400000 implements MigrationInterface {
  name = 'FixKpaAdminRole1712246400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const userId = await queryRunner.query(
      `SELECT id FROM users WHERE email = 'admin-kpa-society@o4o.com'`,
    );
    if (userId.length === 0) {
      console.log(`[FixKpaAdminRole] admin-kpa-society@o4o.com not found, skipping`);
      return;
    }
    const uid = userId[0].id;
    console.log(`[FixKpaAdminRole] Found admin user: ${uid}`);

    // 1. Deactivate any existing non-kpa:admin role_assignments
    await queryRunner.query(
      `UPDATE role_assignments SET is_active = false
       WHERE user_id = $1 AND role != 'kpa:admin' AND is_active = true`,
      [uid],
    );

    // 2. Ensure kpa:admin role_assignment exists
    const existingRa = await queryRunner.query(
      `SELECT id FROM role_assignments WHERE user_id = $1 AND role = 'kpa:admin'`,
      [uid],
    );
    if (existingRa.length === 0) {
      await queryRunner.query(
        `INSERT INTO role_assignments (user_id, role, is_active, scope_type, valid_from, assigned_at, created_at, updated_at)
         VALUES ($1, 'kpa:admin', true, 'global', NOW(), NOW(), NOW(), NOW())`,
        [uid],
      );
      console.log(`[FixKpaAdminRole] Created role_assignment kpa:admin`);
    } else {
      await queryRunner.query(
        `UPDATE role_assignments SET is_active = true WHERE id = $1`,
        [existingRa[0].id],
      );
      console.log(`[FixKpaAdminRole] Activated existing role_assignment kpa:admin`);
    }

    // 3. Ensure service_membership exists with operator role for kpa-society
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
      console.log(`[FixKpaAdminRole] Created kpa-society service_membership`);
    } else {
      await queryRunner.query(
        `UPDATE service_memberships SET role = 'operator', status = 'active' WHERE id = $1`,
        [existingSm[0].id],
      );
      console.log(`[FixKpaAdminRole] Updated kpa-society service_membership`);
    }

    console.log(`[FixKpaAdminRole] Complete`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const userId = await queryRunner.query(
      `SELECT id FROM users WHERE email = 'admin-kpa-society@o4o.com'`,
    );
    if (userId.length > 0) {
      await queryRunner.query(
        `UPDATE role_assignments SET is_active = false
         WHERE user_id = $1 AND role = 'kpa:admin'`,
        [userId[0].id],
      );
    }
  }
}
