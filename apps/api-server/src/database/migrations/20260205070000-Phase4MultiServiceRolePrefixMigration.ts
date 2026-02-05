/**
 * Phase 4 Multi-Service Role Prefix Migration
 *
 * WO-P4′-MULTI-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1
 *
 * Adds service-specific prefixed roles for:
 * - GlycoPharm (glycopharm:*)
 * - GlucoseView (glucoseview:*)
 * - K-Cosmetics (cosmetics:*)
 * - Platform Admin (platform:admin)
 *
 * Note: KPA roles (kpa:*) were already migrated in Phase 1 (20260205040103-KpaRolePrefixMigration)
 *
 * Migration strategy:
 * - Adds new prefixed roles alongside existing legacy roles (dual-format)
 * - Does NOT remove legacy roles (backend now denies them, but data preserved)
 * - Updates role_migration_log table with migration status
 *
 * Service user identification:
 * - GlycoPharm: Users with approved applications in glycopharm_applications
 * - GlucoseView: Users with active pharmacies in glucoseview_pharmacies
 * - Cosmetics: Manual assignment recommended (no membership table)
 * - Platform: Users with 'admin' role but no service_key (cross-service admins)
 *
 * Role mappings:
 * - GlycoPharm admin/operator → glycopharm:admin / glycopharm:operator
 * - GlucoseView admin/operator → glucoseview:admin / glucoseview:operator
 * - Cosmetics admin/operator → cosmetics:admin / cosmetics:operator
 * - Cross-service admin → platform:admin
 * - super_admin → platform:super_admin (already done in Phase 1)
 *
 * IMPORTANT: Safe to run on production. No data is deleted.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4MultiServiceRolePrefixMigration20260205070000 implements MigrationInterface {
  name = 'Phase4MultiServiceRolePrefixMigration20260205070000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Phase 4 Multi-Service Role Prefix Migration starting...');

    // ========================================================================
    // STEP 1: GlycoPharm Service
    // ========================================================================
    console.log('[MIGRATION] Step 1: Migrating GlycoPharm roles...');

    // Add glycopharm:admin to users with approved GlycoPharm applications
    await queryRunner.query(`
      UPDATE users u
      SET roles = array_append(roles, 'glycopharm:admin')
      FROM glycopharm_applications ga
      WHERE ga.user_id = u.id
        AND ga.status = 'approved'
        AND 'admin' = ANY(u.roles)
        AND NOT ('glycopharm:admin' = ANY(u.roles))
    `);

    // Add glycopharm:operator to users with approved GlycoPharm applications
    await queryRunner.query(`
      UPDATE users u
      SET roles = array_append(roles, 'glycopharm:operator')
      FROM glycopharm_applications ga
      WHERE ga.user_id = u.id
        AND ga.status = 'approved'
        AND 'operator' = ANY(u.roles)
        AND NOT ('glycopharm:operator' = ANY(u.roles))
    `);

    const glycopharmStats = await queryRunner.query(`
      SELECT
        COUNT(*) FILTER (WHERE 'glycopharm:admin' = ANY(roles)) as admins,
        COUNT(*) FILTER (WHERE 'glycopharm:operator' = ANY(roles)) as operators
      FROM users
    `);

    console.log('[MIGRATION] GlycoPharm roles migrated:', glycopharmStats[0]);

    // ========================================================================
    // STEP 2: GlucoseView Service
    // ========================================================================
    console.log('[MIGRATION] Step 2: Migrating GlucoseView roles...');

    // Add glucoseview:admin to users with active GlucoseView pharmacies
    await queryRunner.query(`
      UPDATE users u
      SET roles = array_append(roles, 'glucoseview:admin')
      FROM glucoseview_pharmacies gp
      WHERE gp.user_id = u.id
        AND gp.status = 'active'
        AND 'admin' = ANY(u.roles)
        AND NOT ('glucoseview:admin' = ANY(u.roles))
    `);

    // Add glucoseview:operator to users with active GlucoseView pharmacies
    await queryRunner.query(`
      UPDATE users u
      SET roles = array_append(roles, 'glucoseview:operator')
      FROM glucoseview_pharmacies gp
      WHERE gp.user_id = u.id
        AND gp.status = 'active'
        AND 'operator' = ANY(u.roles)
        AND NOT ('glucoseview:operator' = ANY(u.roles))
    `);

    const glucoseviewStats = await queryRunner.query(`
      SELECT
        COUNT(*) FILTER (WHERE 'glucoseview:admin' = ANY(roles)) as admins,
        COUNT(*) FILTER (WHERE 'glucoseview:operator' = ANY(roles)) as operators
      FROM users
    `);

    console.log('[MIGRATION] GlucoseView roles migrated:', glucoseviewStats[0]);

    // ========================================================================
    // STEP 3: Platform Admin (Cross-Service)
    // ========================================================================
    console.log('[MIGRATION] Step 3: Migrating Platform Admin roles...');

    // Add platform:admin to users with 'admin' role but no specific service_key
    // These are cross-service platform administrators
    await queryRunner.query(`
      UPDATE users
      SET roles = array_append(roles, 'platform:admin')
      WHERE 'admin' = ANY(roles)
        AND (service_key IS NULL OR service_key = '' OR service_key = 'platform')
        AND NOT ('platform:admin' = ANY(roles))
        AND NOT ('kpa:admin' = ANY(roles))
        AND NOT ('glycopharm:admin' = ANY(roles))
        AND NOT ('glucoseview:admin' = ANY(roles))
        AND NOT ('cosmetics:admin' = ANY(roles))
    `);

    const platformStats = await queryRunner.query(`
      SELECT
        COUNT(*) FILTER (WHERE 'platform:admin' = ANY(roles)) as admins,
        COUNT(*) FILTER (WHERE 'platform:super_admin' = ANY(roles)) as super_admins
      FROM users
    `);

    console.log('[MIGRATION] Platform admin roles migrated:', platformStats[0]);

    // ========================================================================
    // STEP 4: Update Migration Log
    // ========================================================================
    console.log('[MIGRATION] Step 4: Updating migration log...');

    // Update existing migration log entries for users who got new roles
    await queryRunner.query(`
      INSERT INTO role_migration_log (user_id, service_key, legacy_roles, prefixed_roles, migration_status, migrated_at)
      SELECT
        u.id,
        COALESCE(u.service_key, 'platform') as service_key,
        ARRAY(SELECT unnest(u.roles) WHERE unnest NOT LIKE '%:%') as legacy_roles,
        ARRAY(SELECT unnest(u.roles) WHERE unnest LIKE '%:%') as prefixed_roles,
        CASE
          WHEN EXISTS (SELECT 1 FROM unnest(u.roles) WHERE unnest LIKE '%:%') THEN 'completed'
          ELSE 'pending'
        END as migration_status,
        now() as migrated_at
      FROM users u
      WHERE (
        'glycopharm:admin' = ANY(u.roles) OR
        'glycopharm:operator' = ANY(u.roles) OR
        'glucoseview:admin' = ANY(u.roles) OR
        'glucoseview:operator' = ANY(u.roles) OR
        ('platform:admin' = ANY(u.roles) AND NOT 'kpa:admin' = ANY(u.roles))
      )
      AND NOT EXISTS (
        SELECT 1 FROM role_migration_log rml
        WHERE rml.user_id = u.id
          AND rml.migrated_at >= (now() - interval '1 hour')
      )
      ON CONFLICT (user_id, service_key)
      DO UPDATE SET
        prefixed_roles = EXCLUDED.prefixed_roles,
        migration_status = EXCLUDED.migration_status,
        migrated_at = EXCLUDED.migrated_at
    `);

    // ========================================================================
    // STEP 5: Final Statistics
    // ========================================================================
    console.log('[MIGRATION] Step 5: Gathering final statistics...');

    const finalStats = await queryRunner.query(`
      SELECT
        COUNT(*) FILTER (WHERE 'glycopharm:admin' = ANY(roles)) as glycopharm_admins,
        COUNT(*) FILTER (WHERE 'glycopharm:operator' = ANY(roles)) as glycopharm_operators,
        COUNT(*) FILTER (WHERE 'glucoseview:admin' = ANY(roles)) as glucoseview_admins,
        COUNT(*) FILTER (WHERE 'glucoseview:operator' = ANY(roles)) as glucoseview_operators,
        COUNT(*) FILTER (WHERE 'platform:admin' = ANY(roles)) as platform_admins,
        COUNT(*) FILTER (WHERE 'platform:super_admin' = ANY(roles)) as platform_super_admins,
        COUNT(*) as total_users
      FROM users
      WHERE array_length(roles, 1) > 0
    `);

    console.log('[MIGRATION] ========================================');
    console.log('[MIGRATION] Phase 4 Multi-Service Migration Complete');
    console.log('[MIGRATION] ========================================');
    console.log('[MIGRATION] Final Statistics:', finalStats[0]);
    console.log('[MIGRATION] ========================================');
    console.log('[MIGRATION] Note: Legacy roles retained for data preservation');
    console.log('[MIGRATION] Note: Backend now denies legacy roles (Phase 4.1-4.4)');
    console.log('[MIGRATION] Note: K-Cosmetics roles require manual assignment');
    console.log('[MIGRATION] ========================================');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Rolling back Phase 4 Multi-Service Role Prefix Migration...');

    // Remove Phase 4 prefixed roles (keep legacy roles and Phase 1 KPA roles)
    await queryRunner.query(`
      UPDATE users
      SET roles = ARRAY(
        SELECT unnest(roles)
        WHERE unnest NOT IN (
          'glycopharm:admin',
          'glycopharm:operator',
          'glucoseview:admin',
          'glucoseview:operator',
          'cosmetics:admin',
          'cosmetics:operator'
        )
        AND (
          unnest NOT LIKE 'platform:%'
          OR unnest = 'platform:super_admin'  -- Keep platform:super_admin from Phase 1
        )
      )
      WHERE (
        'glycopharm:admin' = ANY(roles) OR
        'glycopharm:operator' = ANY(roles) OR
        'glucoseview:admin' = ANY(roles) OR
        'glucoseview:operator' = ANY(roles) OR
        'cosmetics:admin' = ANY(roles) OR
        'cosmetics:operator' = ANY(roles) OR
        ('platform:admin' = ANY(roles) AND NOT 'platform:super_admin' = ANY(roles))
      )
    `);

    // Clean up migration log entries for Phase 4
    await queryRunner.query(`
      DELETE FROM role_migration_log
      WHERE service_key IN ('glycopharm', 'glucoseview', 'cosmetics', 'platform')
        AND migration_status = 'completed'
        AND migrated_at >= (now() - interval '1 hour')
    `);

    console.log('[MIGRATION] Rollback complete - Phase 4 prefixed roles removed');
    console.log('[MIGRATION] Note: Phase 1 KPA roles and platform:super_admin retained');
  }
}
