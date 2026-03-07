import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add requested_slug column to glycopharm_applications
 *
 * WO-O4O-GLYCOPHARM-APPLICATION-FLOW-FIX-V1
 *
 * Fix: Original migration (1771200000002) was in src/migrations/ (wrong path).
 * Production uses dist/database/migrations/ — so column was never created.
 * This migration adds the column in the correct path.
 */
export class AddRequestedSlugToGlycopharmApplications20260307000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use IF NOT EXISTS to be safe (in case the old migration was ever run manually)
    await queryRunner.query(`
      ALTER TABLE glycopharm_applications
      ADD COLUMN IF NOT EXISTS requested_slug VARCHAR(120) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE glycopharm_applications
      DROP COLUMN IF EXISTS requested_slug
    `);
  }
}
