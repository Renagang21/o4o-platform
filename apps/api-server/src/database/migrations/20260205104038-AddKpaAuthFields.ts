import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P0+P1: KPA Society Auth Refinement
 *
 * P0-T2: Add serviceKey for data isolation
 * P1-T2: Add nickname for forum display
 * P1-T3: Add pharmacistFunction and pharmacistRole
 */
export class AddKpaAuthFields20260205104038 implements MigrationInterface {
  name = 'AddKpaAuthFields20260205104038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // P0-T2: Add service_key column for data isolation
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "service_key" VARCHAR(100) NULL
    `);

    // Add index for service_key
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_service_key"
      ON "users" ("service_key")
    `);

    // P1-T2: Add nickname column for forum/public display
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "nickname" VARCHAR(100) NULL
    `);

    // P1-T3: Add pharmacist function and role columns
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "pharmacist_function" VARCHAR(50) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "pharmacist_role" VARCHAR(50) NULL
    `);

    // Backfill service_key for existing kpa-society users
    await queryRunner.query(`
      UPDATE "users"
      SET "service_key" = 'kpa-society'
      WHERE "service_key" IS NULL
        AND (
          "email" LIKE '%@kpa-%'
          OR "email" LIKE '%kpa-test%'
          OR "email" IN (
            'district-admin@kpa-test.kr',
            'branch-admin@kpa-test.kr',
            'pharmacist@kpa-test.kr'
          )
        )
    `);

    // Set default service_key for other users
    await queryRunner.query(`
      UPDATE "users"
      SET "service_key" = 'platform'
      WHERE "service_key" IS NULL
    `);

    // Pre-approve test accounts for deployment
    await queryRunner.query(`
      UPDATE "users"
      SET
        "status" = 'ACTIVE',
        "approved_at" = NOW(),
        "approved_by" = 'system-migration-20260205'
      WHERE "email" IN (
        'district-admin@kpa-test.kr',
        'branch-admin@kpa-test.kr',
        'pharmacist@kpa-test.kr'
      )
      AND "status" != 'ACTIVE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns in reverse order
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "pharmacist_role"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "pharmacist_function"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "nickname"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_service_key"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "service_key"
    `);
  }
}
