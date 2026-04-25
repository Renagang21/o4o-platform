import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-LMS-TAG-POLICY-ALIGNMENT-V1
 *
 * lms_courses.tags: TEXT (simple-array comma-separated) → text[] (PostgreSQL native array)
 * O4O Tag Policy V1 정렬 — text[] 타입 통일
 */
export class MigrateLmsCourseTagsToTextArray20260425500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lms_courses
      ALTER COLUMN tags TYPE text[]
      USING CASE
        WHEN tags IS NULL OR tags = '' THEN '{}'::text[]
        ELSE string_to_array(tags, ',')
      END
    `);
    await queryRunner.query(`ALTER TABLE lms_courses ALTER COLUMN tags SET DEFAULT '{}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lms_courses
      ALTER COLUMN tags TYPE text
      USING array_to_string(tags, ',')
    `);
    await queryRunner.query(`ALTER TABLE lms_courses ALTER COLUMN tags DROP DEFAULT`);
  }
}
