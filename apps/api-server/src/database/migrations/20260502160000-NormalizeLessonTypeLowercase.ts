import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-LESSON-TYPE-NORMALIZATION-V1
 *
 * Normalize lms_lessons.type to lowercase across the board.
 *
 * Background: instructor frontend historically sent uppercase ('VIDEO',
 * 'ARTICLE', 'QUIZ', 'ASSIGNMENT', 'LIVE'). The backend Lesson entity declares
 * lowercase enum values, but the column is VARCHAR(20), so uppercase was
 * stored as-is. The learner UI compared against lowercase, breaking type
 * branching for everyone except quiz (which used .toLowerCase() workaround).
 *
 * After this migration:
 *   - all stored values are lowercase
 *   - CHECK constraint guarantees future inserts stay lowercase
 *   - frontend stops needing .toLowerCase() at compare sites
 */
export class NormalizeLessonTypeLowercase20260502160000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE lms_lessons
      SET type = LOWER(type)
      WHERE type IS NOT NULL
        AND type <> LOWER(type)
    `);

    await queryRunner.query(`
      ALTER TABLE lms_lessons
      ADD CONSTRAINT chk_lms_lessons_type_lowercase
      CHECK (type IS NULL OR type = LOWER(type))
    `);

    console.log('[Migration] lms_lessons.type normalized to lowercase + CHECK constraint added');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lms_lessons
      DROP CONSTRAINT IF EXISTS chk_lms_lessons_type_lowercase
    `);
    // Data restoration is not attempted — original casing is unrecoverable.
  }
}
