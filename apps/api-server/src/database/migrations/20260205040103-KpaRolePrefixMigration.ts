/**
 * KPA Role Prefix Migration
 *
 * WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 1
 *
 * Adds prefixed roles to KPA service users alongside existing legacy roles.
 * Maintains dual-format support for backward compatibility.
 *
 * Migration strategy:
 * - Adds new prefixed roles (kpa:*, platform:*) alongside existing roles
 * - Does NOT remove legacy roles (needed for backward compatibility)
 * - Updates role_migration_log table with migration status
 *
 * Role mappings:
 * - 'district_admin' → 'kpa:district_admin'
 * - 'branch_admin' → 'kpa:branch_admin'
 * - 'branch_operator' → 'kpa:branch_operator'
 * - 'pharmacist' → 'kpa:pharmacist'
 * - 'admin' → 'kpa:admin' (if serviceKey = 'kpa')
 * - 'operator' → 'kpa:operator' (if serviceKey = 'kpa')
 * - 'super_admin' → 'platform:super_admin'
 *
 * IMPORTANT: Safe to run on production. No data is deleted.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class KpaRolePrefixMigration20260205040103 implements MigrationInterface {
  name = 'KpaRolePrefixMigration20260205040103';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] KPA Role Prefix Migration - Phase 1 starting...');

    // Step 1: Add prefixed KPA-specific roles
    console.log('[MIGRATION] Adding prefixed KPA-specific roles...');

    // district_admin → kpa:district_admin
    await queryRunner.query(`
      UPDATE users
      SET roles = array_append(roles, 'kpa:district_admin')
      WHERE 'district_admin' = ANY(roles)
        AND NOT ('kpa:district_admin' = ANY(roles))
    `);

    // branch_admin → kpa:branch_admin
    await queryRunner.query(`
      UPDATE users
      SET roles = array_append(roles, 'kpa:branch_admin')
      WHERE 'branch_admin' = ANY(roles)
        AND NOT ('kpa:branch_admin' = ANY(roles))
    `);

    // branch_operator → kpa:branch_operator
    await queryRunner.query(`
      UPDATE users
      SET roles = array_append(roles, 'kpa:branch_operator')
      WHERE 'branch_operator' = ANY(roles)
        AND NOT ('kpa:branch_operator' = ANY(roles))
    `);

    // pharmacist → kpa:pharmacist
    await queryRunner.query(`
      UPDATE users
      SET roles = array_append(roles, 'kpa:pharmacist')
      WHERE 'pharmacist' = ANY(roles)
        AND NOT ('kpa:pharmacist' = ANY(roles))
    `);

    console.log('[MIGRATION] KPA-specific roles migrated');

    // Step 2: Add prefixed roles for KPA service users (admin, operator)
    console.log('[MIGRATION] Adding prefixed roles for KPA service users...');

    // admin → kpa:admin (only for KPA service users)
    await queryRunner.query(`
      UPDATE users
      SET roles = array_append(roles, 'kpa:admin')
      WHERE service_key = 'kpa'
        AND 'admin' = ANY(roles)
        AND NOT ('kpa:admin' = ANY(roles))
    `);

    // operator → kpa:operator (only for KPA service users)
    await queryRunner.query(`
      UPDATE users
      SET roles = array_append(roles, 'kpa:operator')
      WHERE service_key = 'kpa'
        AND 'operator' = ANY(roles)
        AND NOT ('kpa:operator' = ANY(roles))
    `);

    console.log('[MIGRATION] KPA service admin/operator roles migrated');

    // Step 3: Add platform-level super_admin role
    console.log('[MIGRATION] Adding platform-level super_admin...');

    // super_admin → platform:super_admin (all users with super_admin)
    await queryRunner.query(`
      UPDATE users
      SET roles = array_append(roles, 'platform:super_admin')
      WHERE 'super_admin' = ANY(roles)
        AND NOT ('platform:super_admin' = ANY(roles))
    `);

    console.log('[MIGRATION] Platform super_admin migrated');

    // Step 4: Log migration in role_migration_log table
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
      WHERE array_length(u.roles, 1) > 0
        AND NOT EXISTS (
          SELECT 1 FROM role_migration_log rml WHERE rml.user_id = u.id
        )
    `);

    // Get migration statistics
    const stats = await queryRunner.query(`
      SELECT
        COUNT(*) FILTER (WHERE 'kpa:district_admin' = ANY(roles)) as district_admins,
        COUNT(*) FILTER (WHERE 'kpa:branch_admin' = ANY(roles)) as branch_admins,
        COUNT(*) FILTER (WHERE 'kpa:branch_operator' = ANY(roles)) as branch_operators,
        COUNT(*) FILTER (WHERE 'kpa:pharmacist' = ANY(roles)) as pharmacists,
        COUNT(*) FILTER (WHERE 'kpa:admin' = ANY(roles)) as kpa_admins,
        COUNT(*) FILTER (WHERE 'kpa:operator' = ANY(roles)) as kpa_operators,
        COUNT(*) FILTER (WHERE 'platform:super_admin' = ANY(roles)) as platform_super_admins,
        COUNT(*) as total_users
      FROM users
      WHERE array_length(roles, 1) > 0
    `);

    console.log('[MIGRATION] KPA Role Prefix Migration - Phase 1 complete');
    console.log('[MIGRATION] Statistics:', stats[0]);
    console.log('[MIGRATION] Note: Legacy roles retained for backward compatibility');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Rolling back KPA Role Prefix Migration...');

    // Remove prefixed roles (keep legacy roles)
    await queryRunner.query(`
      UPDATE users
      SET roles = ARRAY(SELECT unnest(roles) WHERE unnest NOT LIKE '%:%')
      WHERE EXISTS (SELECT 1 FROM unnest(roles) WHERE unnest LIKE '%:%')
    `);

    // Clear migration log
    await queryRunner.query(`
      DELETE FROM role_migration_log
      WHERE migration_status = 'completed'
        AND created_at >= (now() - interval '1 hour')
    `);

    console.log('[MIGRATION] Rollback complete - all prefixed roles removed');
  }
}
