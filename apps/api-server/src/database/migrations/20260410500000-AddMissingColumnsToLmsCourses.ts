import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add missing isPaid + price columns to lms_courses
 *
 * The original CreateLmsCoreTables migration (20260410000001) omitted
 * these two columns that the Course entity defines. TypeORM SELECT
 * queries reference them, causing "column does not exist" 500 errors.
 *
 * Uses IF NOT EXISTS guard via a DO block to be idempotent.
 */
export class AddMissingColumnsToLmsCourses20260410500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isPaid column if missing
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lms_courses' AND column_name = 'isPaid'
        ) THEN
          ALTER TABLE lms_courses ADD COLUMN "isPaid" BOOLEAN DEFAULT false;
        END IF;
      END $$
    `);

    // Add price column if missing
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lms_courses' AND column_name = 'price'
        ) THEN
          ALTER TABLE lms_courses ADD COLUMN "price" DECIMAL(10,2);
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE lms_courses DROP COLUMN IF EXISTS "price"`);
    await queryRunner.query(`ALTER TABLE lms_courses DROP COLUMN IF EXISTS "isPaid"`);
  }
}
