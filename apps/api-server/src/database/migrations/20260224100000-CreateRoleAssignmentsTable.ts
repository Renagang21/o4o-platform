/**
 * Migration: CreateRoleAssignmentsTable
 *
 * WO-O4O-RBAC-FOUNDATION-NORMALIZATION-PHASE1-V1
 *
 * Creates the role_assignments table if it does not exist.
 * This is the authoritative CREATE TABLE for the Auth module's
 * RoleAssignment entity (single source of truth).
 *
 * Includes scope_type/scope_id columns for future organization-core usage.
 *
 * @see IR-O4O-ROLE-ASSIGNMENTS-SCHEMA-V1.md
 * @see apps/api-server/src/modules/auth/entities/RoleAssignment.ts
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoleAssignmentsTable1708736400000 implements MigrationInterface {
  name = 'CreateRoleAssignmentsTable1708736400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_assignments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "role" VARCHAR(50) NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "valid_from" TIMESTAMP NOT NULL DEFAULT NOW(),
        "valid_until" TIMESTAMP,
        "assigned_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "assigned_by" UUID,
        "scope_type" VARCHAR(50) DEFAULT 'global',
        "scope_id" UUID,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_role_assignments_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_assignments_assigner"
          FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // 2. Indexes (all IF NOT EXISTS for idempotency)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_assignments_user_id"
        ON "role_assignments" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_assignments_role"
        ON "role_assignments" ("role");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_assignments_is_active"
        ON "role_assignments" ("is_active");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_assignments_user_active"
        ON "role_assignments" ("user_id", "is_active");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_assignments_user_role"
        ON "role_assignments" ("user_id", "role");
    `);

    // 3. Unique constraint: one active role per user (Phase 1)
    // Note: Phase 2 scope-based uniqueness will need constraint evolution
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'unique_active_role_per_user'
        ) THEN
          ALTER TABLE "role_assignments"
          ADD CONSTRAINT "unique_active_role_per_user"
          UNIQUE ("user_id", "role", "is_active");
        END IF;
      END $$;
    `);

    // 4. Scope indexes (for organization-core Phase 2)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_assignments_scope"
        ON "role_assignments" ("scope_type", "scope_id");
    `);

    // 5. Scope constraint (organization-core install.ts compatible)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_org_scope'
        ) THEN
          ALTER TABLE "role_assignments"
          ADD CONSTRAINT "chk_org_scope"
          CHECK (
            (scope_type = 'global' AND scope_id IS NULL) OR
            (scope_type = 'organization' AND scope_id IS NOT NULL) OR
            (scope_type IS NULL)
          );
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "role_assignments" CASCADE`);
  }
}
