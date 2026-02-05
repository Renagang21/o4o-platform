/**
 * Neture Role Prefix Migration
 *
 * WO-P1-SERVICE-ROLE-PREFIX-ROLLING-IMPLEMENTATION-V1 - Phase 3 (Neture)
 *
 * Adds prefixed roles to Neture service users alongside existing legacy roles.
 * Maintains dual-format support for backward compatibility.
 *
 * Migration strategy:
 * - Adds new prefixed roles (neture:*) alongside existing roles
 * - Does NOT remove legacy roles (needed for backward compatibility)
 * - Updates role_migration_log table with migration status
 *
 * Role mappings:
 * - 'admin' → 'neture:admin' (if serviceKey = 'neture')
 * - 'operator' → 'neture:operator' (if serviceKey = 'neture')
 *
 * Note: platform:super_admin was already added in Phase 1 (KPA migration)
 *
 * IMPORTANT: Safe to run on production. No data is deleted.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NetureRolePrefixMigration20260205060000 implements MigrationInterface {
  name = 'NetureRolePrefixMigration20260205060000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Neture Role Prefix Migration - Phase 3 starting...');

    // Step 1: Add prefixed roles for Neture service users (admin, operator)
    console.log('[MIGRATION] Adding prefixed roles for Neture service users...');

    // admin → neture:admin (only for Neture service users)
    const adminResult = await queryRunner.query(`
      UPDATE users
      SET roles = array_append(roles, 'neture:admin')
      WHERE service_key = 'neture'
        AND 'admin' = ANY(roles)
        AND NOT ('neture:admin' = ANY(roles))
      RETURNING id
    `);

    console.log(`[MIGRATION] Added neture:admin to ${adminResult.length} users`);

    // operator → neture:operator (only for Neture service users)
    const operatorResult = await queryRunner.query(`
      UPDATE users
      SET roles = array_append(roles, 'neture:operator')
      WHERE service_key = 'neture'
        AND 'operator' = ANY(roles)
        AND NOT ('neture:operator' = ANY(roles))
      RETURNING id
    `);

    console.log(`[MIGRATION] Added neture:operator to ${operatorResult.length} users`);
    console.log('[MIGRATION] Neture service admin/operator roles migrated');

    // Step 2: Log migration in role_migration_log table
    console.log('[MIGRATION] Logging migration status...');

    await queryRunner.query(`
      INSERT INTO role_migration_log (user_id, service_key, legacy_roles, prefixed_roles, migration_status, migrated_at)
      SELECT
        u.id,
        u.service_key,
        ARRAY(SELECT unnest(u.roles) WHERE unnest NOT LIKE '%:%') as legacy_roles,
        ARRAY(SELECT unnest(u.roles) WHERE unnest LIKE '%:%') as prefixed_roles,
        CASE
          WHEN NOT EXISTS (SELECT 1 FROM unnest(u.roles) WHERE unnest NOT LIKE '%:%') THEN 'completed'
          WHEN EXISTS (SELECT 1 FROM unnest(u.roles) WHERE unnest LIKE '%:%') THEN 'completed'
          ELSE 'pending'
        END as migration_status,
        now() as migrated_at
      FROM users u
      WHERE u.service_key = 'neture'
        AND array_length(u.roles, 1) > 0
        AND NOT EXISTS (
          SELECT 1 FROM role_migration_log rml
          WHERE rml.user_id = u.id
            AND rml.service_key = 'neture'
        )
    `);

    // Get migration statistics
    const stats = await queryRunner.query(`
      SELECT
        COUNT(*) FILTER (WHERE 'neture:admin' = ANY(roles)) as neture_admins,
        COUNT(*) FILTER (WHERE 'neture:operator' = ANY(roles)) as neture_operators,
        COUNT(*) FILTER (WHERE service_key = 'neture') as total_neture_users
      FROM users
      WHERE service_key = 'neture'
        AND array_length(roles, 1) > 0
    `);

    console.log('[MIGRATION] Neture Role Prefix Migration - Phase 3 complete');
    console.log('[MIGRATION] Statistics:', stats[0]);
    console.log('[MIGRATION] Note: Legacy roles retained for backward compatibility');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Rolling back Neture Role Prefix Migration - Phase 3...');

    // Remove prefixed neture roles
    await queryRunner.query(`
      UPDATE users
      SET roles = ARRAY(SELECT unnest(roles) WHERE unnest NOT IN ('neture:admin', 'neture:operator'))
      WHERE service_key = 'neture'
        AND ('neture:admin' = ANY(roles) OR 'neture:operator' = ANY(roles))
    `);

    // Remove migration log entries
    await queryRunner.query(`
      DELETE FROM role_migration_log
      WHERE service_key = 'neture'
    `);

    console.log('[MIGRATION] Neture Role Prefix Migration - Phase 3 rolled back');
    console.log('[MIGRATION] Legacy roles restored');
  }
}
