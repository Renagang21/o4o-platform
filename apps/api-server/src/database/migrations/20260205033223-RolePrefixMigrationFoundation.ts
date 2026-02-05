/**
 * Role Prefix Migration Foundation
 *
 * WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 0
 *
 * This migration prepares the database for the role prefix migration.
 * It does NOT modify existing roles - only adds auxiliary structures for tracking.
 *
 * Purpose:
 * 1. Create role_migration_log table to track migration progress
 * 2. Add indexes for better role query performance
 * 3. Document dual-format support period
 *
 * IMPORTANT: This is a READ-ONLY migration. No existing data is modified.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RolePrefixMigrationFoundation20260205033223 implements MigrationInterface {
  name = 'RolePrefixMigrationFoundation20260205033223';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create role_migration_log table to track migration progress
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_migration_log" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "service_key" varchar(50),
        "legacy_roles" text[] NOT NULL DEFAULT '{}',
        "prefixed_roles" text[] NOT NULL DEFAULT '{}',
        "migration_status" varchar(20) NOT NULL DEFAULT 'pending',
        "migrated_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_role_migration_log_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create index on user_id for fast lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_migration_log_user_id"
      ON "role_migration_log" ("user_id")
    `);

    // Create index on migration_status for filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_migration_log_status"
      ON "role_migration_log" ("migration_status")
    `);

    // Create index on service_key for service-specific queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_role_migration_log_service"
      ON "role_migration_log" ("service_key")
    `);

    // Add comment to users table documenting dual-format support
    await queryRunner.query(`
      COMMENT ON COLUMN "users"."roles" IS
      'User roles - supports dual format during migration:
       - Legacy: "admin", "operator", "district_admin", etc.
       - Prefixed: "platform:admin", "kpa:admin", "service:role", etc.
       Migration period: 2026-02-05 onwards (Phase 0-7, ~4-6 weeks)
       After migration: Only prefixed format will be used.
       See: WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1'
    `);

    // Create GIN index on users.roles for efficient array containment queries
    // This helps with queries like: WHERE 'kpa:admin' = ANY(roles)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_roles_gin"
      ON "users" USING GIN ("roles")
    `);

    // Log migration execution
    console.log('[MIGRATION] Role Prefix Migration Foundation - Phase 0 complete');
    console.log('[MIGRATION] Created role_migration_log table');
    console.log('[MIGRATION] Added indexes for role queries');
    console.log('[MIGRATION] Dual-format support enabled');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove GIN index on users.roles
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_roles_gin"
    `);

    // Remove comment from users.roles
    await queryRunner.query(`
      COMMENT ON COLUMN "users"."roles" IS NULL
    `);

    // Drop indexes on role_migration_log
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_role_migration_log_service"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_role_migration_log_status"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_role_migration_log_user_id"
    `);

    // Drop role_migration_log table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "role_migration_log"
    `);

    console.log('[MIGRATION] Role Prefix Migration Foundation - Rollback complete');
  }
}
