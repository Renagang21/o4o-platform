/**
 * Convert roles column from simple-array (text) to text[] array
 *
 * WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 0.5
 *
 * This migration converts the User.roles column from TypeORM's simple-array
 * format (comma-separated text) to PostgreSQL's native text[] array type.
 *
 * This is required before running KPA/Neture/GlycoPharm role prefix migrations,
 * as they use PostgreSQL array operators (ANY, array_append, etc.) which require
 * a proper array column.
 *
 * Migration strategy:
 * 1. Parse existing comma-separated role strings
 * 2. Convert to PostgreSQL text[] array
 * 3. Handle empty/null values gracefully
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertRolesToArrayType20260205035000 implements MigrationInterface {
  name = 'ConvertRolesToArrayType20260205035000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Converting roles from simple-array to text[] array...');

    // Step 1: Add temporary column to store array data
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS roles_array text[]
    `);

    // Step 2: Convert simple-array (comma-separated) to text[] array
    // Handle cases: null, empty string, single value, multiple values
    await queryRunner.query(`
      UPDATE users
      SET roles_array =
        CASE
          WHEN roles IS NULL OR roles = '' THEN ARRAY['user']::text[]
          WHEN roles LIKE '%,%' THEN string_to_array(roles, ',')::text[]
          ELSE ARRAY[roles]::text[]
        END
    `);

    // Step 3: Drop old roles column
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN roles
    `);

    // Step 4: Rename roles_array to roles
    await queryRunner.query(`
      ALTER TABLE users
      RENAME COLUMN roles_array TO roles
    `);

    // Step 5: Add NOT NULL constraint and default
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN roles SET DEFAULT ARRAY['user']::text[],
      ALTER COLUMN roles SET NOT NULL
    `);

    console.log('[MIGRATION] Roles column converted to text[] array');
    console.log('[MIGRATION] All existing role data preserved');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Rolling back roles array conversion...');

    // Step 1: Add temporary text column
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS roles_text text
    `);

    // Step 2: Convert array back to comma-separated string
    await queryRunner.query(`
      UPDATE users
      SET roles_text = array_to_string(roles, ',')
    `);

    // Step 3: Drop array column
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN roles
    `);

    // Step 4: Rename back
    await queryRunner.query(`
      ALTER TABLE users
      RENAME COLUMN roles_text TO roles
    `);

    // Step 5: Restore simple-array format constraints
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN roles SET DEFAULT 'user'
    `);

    console.log('[MIGRATION] Rollback complete - roles restored to simple-array format');
  }
}
