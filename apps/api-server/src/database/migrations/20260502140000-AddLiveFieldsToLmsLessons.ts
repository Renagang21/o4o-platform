import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-LIVE-MINIMAL-V1
 *
 * Add minimal live-lesson fields to lms_lessons.
 * Used only when type === 'live'. YouTube URL only (validated at API layer).
 */
export class AddLiveFieldsToLmsLessons20260502140000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lms_lessons
        ADD COLUMN IF NOT EXISTS "liveStartAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "liveEndAt"   TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "liveUrl"     TEXT
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_lessons_liveStartAt"
        ON lms_lessons ("liveStartAt")
        WHERE "liveStartAt" IS NOT NULL
    `);

    console.log('[Migration] lms_lessons: added live fields');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lms_lessons_liveStartAt"`);
    await queryRunner.query(`
      ALTER TABLE lms_lessons
        DROP COLUMN IF EXISTS "liveStartAt",
        DROP COLUMN IF EXISTS "liveEndAt",
        DROP COLUMN IF EXISTS "liveUrl"
    `);
  }
}
