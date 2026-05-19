import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-LIVE-LESSON-DEPRECATION-PHASE3-DEAD-BACKEND-CLEANUP-V1
 *
 * Drop live lesson DB columns from lms_lessons.
 * These columns were added by 20260502140000-AddLiveFieldsToLmsLessons.ts
 * and are safe to remove:
 *   - All columns are nullable (no data loss)
 *   - live lesson feature is fully disabled (Phase 1 UI removal + Phase 3 backend removal)
 *   - IF EXISTS guards prevent failure if already dropped
 */
export class DropLiveFieldsFromLmsLessons20260520000000 implements MigrationInterface {
  name = 'DropLiveFieldsFromLmsLessons20260520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lms_lessons_liveStartAt"`);
    await queryRunner.query(`ALTER TABLE "lms_lessons" DROP COLUMN IF EXISTS "liveStartAt"`);
    await queryRunner.query(`ALTER TABLE "lms_lessons" DROP COLUMN IF EXISTS "liveEndAt"`);
    await queryRunner.query(`ALTER TABLE "lms_lessons" DROP COLUMN IF EXISTS "liveUrl"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lms_lessons" ADD COLUMN IF NOT EXISTS "liveUrl" text`);
    await queryRunner.query(`ALTER TABLE "lms_lessons" ADD COLUMN IF NOT EXISTS "liveEndAt" timestamp`);
    await queryRunner.query(`ALTER TABLE "lms_lessons" ADD COLUMN IF NOT EXISTS "liveStartAt" timestamp`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lms_lessons_liveStartAt" ON "lms_lessons" ("liveStartAt")`);
  }
}
