/**
 * WO-ROLE-NORMALIZATION-PHASE3-E-PR2-LEGACY-DROP-V1
 *
 * Final RBAC schema cleanup:
 * 1. Backfill user_roles (ManyToMany bridge) → role_assignments
 * 2. DROP users.role column
 * 3. DROP users.roles column
 * 4. DROP users.active_role_id column
 * 5. DROP user_roles bridge table
 * 6. DROP related enum type
 *
 * Prerequisites:
 * - PR1 deployed: all code references to users.role/roles removed
 * - BackfillRoleAssignments migration already synced users.role/roles → role_assignments
 * - All active users have role_assignments entries
 *
 * After this migration, role_assignments is the ONLY RBAC source.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacyRbacColumns20260228000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 0. Safety check: role_assignments table must exist ──
    const hasRoleAssignments = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'role_assignments'
      ) AS exists
    `);

    if (!hasRoleAssignments[0]?.exists) {
      // eslint-disable-next-line no-console
      console.error('[Migration] DropLegacyRbacColumns: ABORTED - role_assignments table does not exist');
      return;
    }

    // ── 1. Backfill user_roles → role_assignments ──
    // Sync any roles that exist only in the user_roles bridge table
    const hasUserRoles = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_roles'
      ) AS exists
    `);

    if (hasUserRoles[0]?.exists) {
      // Try to backfill user_roles → role_assignments
      // Column names vary depending on when synchronize created the table
      try {
        // Discover actual column names from information_schema
        const columns = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'user_roles'
          ORDER BY ordinal_position
        `);
        const colNames = columns.map((c: any) => c.column_name);
        // eslint-disable-next-line no-console
        console.log('[Migration] DropLegacyRbacColumns: user_roles columns:', colNames.join(', '));

        // Find user FK column (usersId or users_id)
        const userCol = colNames.find((c: string) => c.toLowerCase().includes('user'));
        // Find role FK column (rolesId or roles_id)
        const roleCol = colNames.find((c: string) => c.toLowerCase().includes('role'));

        const hasRolesTable = await queryRunner.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'roles'
          ) AS exists
        `);

        if (userCol && roleCol && hasRolesTable[0]?.exists) {
          await queryRunner.query(`
            INSERT INTO role_assignments (id, user_id, role, is_active, valid_from, assigned_at, scope_type)
            SELECT gen_random_uuid(), ur."${userCol}", r.name, true, NOW(), NOW(), 'global'
            FROM user_roles ur
            JOIN roles r ON r.id = ur."${roleCol}"
            WHERE NOT EXISTS (
              SELECT 1 FROM role_assignments ra
              WHERE ra.user_id = ur."${userCol}" AND ra.role = r.name AND ra.is_active = true
            )
            ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING
          `);
          // eslint-disable-next-line no-console
          console.log('[Migration] DropLegacyRbacColumns: Backfilled user_roles → role_assignments');
        } else {
          // eslint-disable-next-line no-console
          console.warn('[Migration] DropLegacyRbacColumns: Skipped backfill - columns or roles table not found');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Migration] DropLegacyRbacColumns: Backfill skipped due to error:', (err as Error).message);
      }

      // ── 2. DROP user_roles bridge table ──
      await queryRunner.query(`DROP TABLE IF EXISTS user_roles`);
      // eslint-disable-next-line no-console
      console.log('[Migration] DropLegacyRbacColumns: Dropped user_roles table');
    }

    // ── 3. DROP users.active_role_id (FK to roles) ──
    const hasActiveRoleId = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'active_role_id'
      ) AS exists
    `);

    if (hasActiveRoleId[0]?.exists) {
      await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS active_role_id`);
      // eslint-disable-next-line no-console
      console.log('[Migration] DropLegacyRbacColumns: Dropped users.active_role_id');
    }

    // ── 4. DROP users.roles (text[] array) ──
    const hasRolesColumn = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'roles'
      ) AS exists
    `);

    if (hasRolesColumn[0]?.exists) {
      await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS roles`);
      // eslint-disable-next-line no-console
      console.log('[Migration] DropLegacyRbacColumns: Dropped users.roles');
    }

    // ── 5. DROP users.role (enum) ──
    const hasRoleColumn = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
      ) AS exists
    `);

    if (hasRoleColumn[0]?.exists) {
      await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS role`);
      // eslint-disable-next-line no-console
      console.log('[Migration] DropLegacyRbacColumns: Dropped users.role');
    }

    // ── 6. DROP enum type ──
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
    // eslint-disable-next-line no-console
    console.log('[Migration] DropLegacyRbacColumns: Dropped users_role_enum type');

    // ── 7. DROP index (may already be auto-removed with column) ──
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_role"`);

    // eslint-disable-next-line no-console
    console.log('[Migration] DropLegacyRbacColumns: COMPLETED - Legacy RBAC schema removed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate enum type
    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM (
        'user', 'admin', 'super_admin', 'seller', 'supplier', 'partner', 'customer'
      )
    `);

    // Recreate columns
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN role "public"."users_role_enum" NOT NULL DEFAULT 'user'
    `);

    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN roles text[] NOT NULL DEFAULT ARRAY['user']::text[]
    `);

    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN active_role_id uuid
    `);

    // Recreate index
    await queryRunner.query(`
      CREATE INDEX "IDX_users_role" ON users (role)
    `);

    // Backfill from role_assignments
    await queryRunner.query(`
      UPDATE users u SET
        role = COALESCE((
          SELECT ra.role::text::"public"."users_role_enum"
          FROM role_assignments ra
          WHERE ra.user_id = u.id AND ra.is_active = true
          ORDER BY ra.assigned_at ASC
          LIMIT 1
        ), 'user'),
        roles = COALESCE((
          SELECT array_agg(ra.role)
          FROM role_assignments ra
          WHERE ra.user_id = u.id AND ra.is_active = true
        ), ARRAY['user']::text[])
    `);

    // eslint-disable-next-line no-console
    console.log('[Migration] DropLegacyRbacColumns: REVERTED - Legacy columns restored from role_assignments');
  }
}
