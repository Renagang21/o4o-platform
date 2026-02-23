/**
 * Migration: CreateRoleAssignmentsTable
 *
 * WO-O4O-RBAC-FOUNDATION-NORMALIZATION-PHASE1-V1
 *
 * Normalizes the role_assignments table schema.
 *
 * Scenario A: Table does NOT exist → CREATE TABLE with snake_case columns
 * Scenario B: Table exists with camelCase columns (TypeORM synchronize legacy)
 *   → Rename columns to snake_case + add missing columns
 *
 * @see IR-O4O-ROLE-ASSIGNMENTS-SCHEMA-V1.md
 * @see apps/api-server/src/modules/auth/entities/RoleAssignment.ts
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoleAssignmentsTable1708736400000 implements MigrationInterface {
  name = 'CreateRoleAssignmentsTable1708736400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'role_assignments'
      );
    `);

    if (!tableExists[0].exists) {
      // === Scenario A: Fresh create ===
      await queryRunner.query(`
        CREATE TABLE "role_assignments" (
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
          "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      // === Scenario B: Table exists — normalize camelCase → snake_case ===

      // Helper: rename column if old exists and new doesn't
      const renameIfNeeded = async (oldName: string, newName: string) => {
        const hasOld = await queryRunner.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'role_assignments' AND column_name = $1
          );
        `, [oldName]);
        const hasNew = await queryRunner.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'role_assignments' AND column_name = $1
          );
        `, [newName]);

        if (hasOld[0].exists && !hasNew[0].exists) {
          await queryRunner.query(
            `ALTER TABLE "role_assignments" RENAME COLUMN "${oldName}" TO "${newName}"`
          );
        }
      };

      // Rename camelCase → snake_case
      await renameIfNeeded('userId', 'user_id');
      await renameIfNeeded('isActive', 'is_active');
      await renameIfNeeded('validFrom', 'valid_from');
      await renameIfNeeded('validUntil', 'valid_until');
      await renameIfNeeded('assignedAt', 'assigned_at');
      await renameIfNeeded('assignedBy', 'assigned_by');
      await renameIfNeeded('scopeType', 'scope_type');
      await renameIfNeeded('scopeId', 'scope_id');
      await renameIfNeeded('createdAt', 'created_at');
      await renameIfNeeded('updatedAt', 'updated_at');

      // Add missing columns (snake_case) if they don't exist
      const addColumnIfMissing = async (colName: string, colDef: string) => {
        const has = await queryRunner.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'role_assignments' AND column_name = $1
          );
        `, [colName]);

        if (!has[0].exists) {
          await queryRunner.query(
            `ALTER TABLE "role_assignments" ADD COLUMN "${colName}" ${colDef}`
          );
        }
      };

      await addColumnIfMissing('user_id', 'UUID');
      await addColumnIfMissing('role', "VARCHAR(50) NOT NULL DEFAULT ''");
      await addColumnIfMissing('is_active', 'BOOLEAN NOT NULL DEFAULT true');
      await addColumnIfMissing('valid_from', 'TIMESTAMP DEFAULT NOW()');
      await addColumnIfMissing('valid_until', 'TIMESTAMP');
      await addColumnIfMissing('assigned_at', 'TIMESTAMP DEFAULT NOW()');
      await addColumnIfMissing('assigned_by', 'UUID');
      await addColumnIfMissing('scope_type', "VARCHAR(50) DEFAULT 'global'");
      await addColumnIfMissing('scope_id', 'UUID');
      await addColumnIfMissing('created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
      await addColumnIfMissing('updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    }

    // === Common: Indexes (IF NOT EXISTS for idempotency) ===
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

    // Scope index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_assignments_scope"
        ON "role_assignments" ("scope_type", "scope_id");
    `);

    // === Common: Constraints ===

    // FK to users (if not exists)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_role_assignments_user'
        ) THEN
          ALTER TABLE "role_assignments"
          ADD CONSTRAINT "fk_role_assignments_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'fk_role_assignments_user skipped: %', SQLERRM;
      END $$;
    `);

    // FK assigner (if not exists)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_role_assignments_assigner'
        ) THEN
          ALTER TABLE "role_assignments"
          ADD CONSTRAINT "fk_role_assignments_assigner"
          FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'fk_role_assignments_assigner skipped: %', SQLERRM;
      END $$;
    `);

    // Unique constraint
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
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'unique_active_role_per_user skipped: %', SQLERRM;
      END $$;
    `);

    // Scope check constraint
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
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'chk_org_scope skipped: %', SQLERRM;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "role_assignments" CASCADE`);
  }
}
