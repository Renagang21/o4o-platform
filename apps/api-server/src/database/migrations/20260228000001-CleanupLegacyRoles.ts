/**
 * WO-OPERATOR-ROLE-CLEANUP-V1
 *
 * Clean up legacy unprefixed roles and migrate platform:admin users
 * to service-specific admin roles.
 *
 * Changes:
 * 1. Remove all unprefixed legacy roles from users.roles[]
 * 2. Convert platform:admin users to service-specific admin by email
 * 3. Set Super Admin to platform:super_admin only
 * 4. Remove platform:admin and platform:operator from remaining users
 * 5. Deactivate legacy role_assignments
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupLegacyRoles20260228000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Remove unprefixed legacy roles from all users ──
    const legacyRoles = [
      'admin',
      'super_admin',
      'operator',
      'administrator',
      'manager',
      'seller',
      'vendor',
      'business',
    ];

    for (const role of legacyRoles) {
      await queryRunner.query(
        `UPDATE users SET roles = array_remove(roles, $1) WHERE $1 = ANY(roles)`,
        [role]
      );
    }

    // eslint-disable-next-line no-console
    console.log('[Migration] CleanupLegacyRoles: Removed unprefixed legacy roles');

    // ── 2. Convert known platform:admin users to service-specific admin ──
    // NetureAdmin → neture:admin
    await queryRunner.query(`
      UPDATE users SET roles = ARRAY['neture:admin']::text[]
      WHERE email = 'admin-neture@o4o.com'
    `);

    // GlycopharmAdmin → glycopharm:admin
    await queryRunner.query(`
      UPDATE users SET roles = ARRAY['glycopharm:admin']::text[]
      WHERE email = 'admin-glycopharm@o4o.com'
    `);

    // GlucoseViewAdmin → glucoseview:admin
    await queryRunner.query(`
      UPDATE users SET roles = ARRAY['glucoseview:admin']::text[]
      WHERE email = 'admin-glucoseview@o4o.com'
    `);

    // KPA 서 관리자 → kpa:admin
    await queryRunner.query(`
      UPDATE users SET roles = ARRAY['kpa:admin']::text[]
      WHERE email = 'admin-kpa-society@o4o.com'
    `);

    // ── 3. Super Admin → platform:super_admin only ──
    await queryRunner.query(`
      UPDATE users SET roles = ARRAY['platform:super_admin']::text[]
      WHERE email = 'sohae2100@gmail.com'
    `);

    // eslint-disable-next-line no-console
    console.log('[Migration] CleanupLegacyRoles: Converted platform:admin users to service-specific roles');

    // ── 4. Remove platform:admin and platform:operator from remaining users ──
    await queryRunner.query(`
      UPDATE users SET roles = array_remove(roles, 'platform:admin')
      WHERE 'platform:admin' = ANY(roles)
    `);

    await queryRunner.query(`
      UPDATE users SET roles = array_remove(roles, 'platform:operator')
      WHERE 'platform:operator' = ANY(roles)
    `);

    // eslint-disable-next-line no-console
    console.log('[Migration] CleanupLegacyRoles: Removed platform:admin and platform:operator');

    // ── 5. Sync to role_assignments (new RBAC source) ──
    const hasRoleAssignments = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'role_assignments'
      ) AS exists
    `);

    if (hasRoleAssignments[0]?.exists) {
      // 5-A. Deactivate legacy role_assignments
      await queryRunner.query(`
        UPDATE role_assignments SET is_active = false
        WHERE role IN ('admin', 'super_admin', 'operator', 'administrator',
                       'platform:admin', 'platform:operator',
                       'manager', 'seller', 'vendor', 'business')
          AND is_active = true
      `);

      // 5-B. Insert service-specific admin roles (matching step 2-3)
      const adminMappings = [
        { email: 'admin-neture@o4o.com', role: 'neture:admin' },
        { email: 'admin-glycopharm@o4o.com', role: 'glycopharm:admin' },
        { email: 'admin-glucoseview@o4o.com', role: 'glucoseview:admin' },
        { email: 'admin-kpa-society@o4o.com', role: 'kpa:admin' },
        { email: 'sohae2100@gmail.com', role: 'platform:super_admin' },
      ];

      for (const { email, role } of adminMappings) {
        await queryRunner.query(`
          INSERT INTO role_assignments (user_id, role, is_active, valid_from, assigned_at, scope_type)
          SELECT id, $1, true, NOW(), NOW(), 'global'
          FROM users WHERE email = $2
          ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING
        `, [role, email]);
      }

      // eslint-disable-next-line no-console
      console.log('[Migration] CleanupLegacyRoles: Synced role_assignments with service-specific roles');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversibility: restore platform:admin to known admin users
    // Note: unprefixed roles are intentionally NOT restored (they were deprecated)

    await queryRunner.query(`
      UPDATE users SET roles = array_append(roles, 'platform:admin')
      WHERE email IN (
        'admin-neture@o4o.com',
        'admin-glycopharm@o4o.com',
        'admin-glucoseview@o4o.com',
        'admin-kpa-society@o4o.com'
      )
    `);

    await queryRunner.query(`
      UPDATE users SET roles = array_append(roles, 'platform:super_admin')
      WHERE email = 'sohae2100@gmail.com'
        AND NOT ('platform:super_admin' = ANY(roles))
    `);

    // Re-activate role_assignments
    const hasRoleAssignments = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'role_assignments'
      ) AS exists
    `);

    if (hasRoleAssignments[0]?.exists) {
      await queryRunner.query(`
        UPDATE role_assignments SET is_active = true
        WHERE role IN ('platform:admin', 'platform:operator')
          AND is_active = false
      `);
    }
  }
}
