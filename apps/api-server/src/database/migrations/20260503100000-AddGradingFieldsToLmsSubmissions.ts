import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-ASSIGNMENT-GRADING-V1
 *
 * lms_submissions에 채점/피드백 컬럼 추가.
 * 기존 row는 NOT NULL DEFAULT 'ungraded'로 자동 채워짐 → 데이터 손실/회귀 0.
 *
 * 정책:
 *   - submission == lesson 진도 완료 인정 (변경 없음)
 *   - grading == 강사 평가/피드백 (수료/인증서/Credit 조건 아님)
 *   - 'returned' 또는 낮은 점수도 이미 지급된 Credit은 회수하지 않음
 *
 * 컬럼 명명 규칙: lms_submissions 기존 관례 (camelCase quoted) 따름.
 */
export class AddGradingFieldsToLmsSubmissions20260503100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_submissions
        ADD COLUMN IF NOT EXISTS "gradingStatus" VARCHAR(20) NOT NULL DEFAULT 'ungraded'
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_submissions
        ADD COLUMN IF NOT EXISTS "score" INTEGER NULL
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_submissions
        ADD COLUMN IF NOT EXISTS "feedback" TEXT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_submissions
        ADD COLUMN IF NOT EXISTS "gradedAt" TIMESTAMP NULL
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_submissions
        ADD COLUMN IF NOT EXISTS "gradedBy" UUID NULL
    `);

    console.log('[Migration] lms_submissions: added grading fields (gradingStatus, score, feedback, gradedAt, gradedBy)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_submissions
        DROP COLUMN IF EXISTS "gradedBy"
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_submissions
        DROP COLUMN IF EXISTS "gradedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_submissions
        DROP COLUMN IF EXISTS "feedback"
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_submissions
        DROP COLUMN IF EXISTS "score"
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_submissions
        DROP COLUMN IF EXISTS "gradingStatus"
    `);
  }
}
