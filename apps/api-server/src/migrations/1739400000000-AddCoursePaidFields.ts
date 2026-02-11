import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add Paid Course Fields Migration
 *
 * WO-LMS-PAID-COURSE-V1
 * Adds isPaid and price columns to lms_courses table.
 * Extends OrderType enum with 'lms' value.
 */
export class AddCoursePaidFields1739400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Course 유료 필드 추가
    await queryRunner.query(`
      ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS "isPaid" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS price decimal(10,2)
    `);

    // OrderType enum 확장
    await queryRunner.query(`
      ALTER TYPE ecommerce_order_ordertype_enum ADD VALUE IF NOT EXISTS 'lms'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE lms_courses DROP COLUMN IF EXISTS price`);
    await queryRunner.query(`ALTER TABLE lms_courses DROP COLUMN IF EXISTS "isPaid"`);
    // Note: PostgreSQL does not support removing enum values
  }
}
