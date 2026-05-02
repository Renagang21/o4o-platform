import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
 *
 * lms_courses에 rejectionReason 컬럼 추가 — 운영자 반려 사유 저장.
 *
 * status 컬럼은 varchar(20)으로 이미 정의되어 있어 'pending_review' / 'rejected'
 * 신규 enum 값을 별도 ALTER TYPE 없이 그대로 저장 가능 (varchar는 자유 문자열).
 * 따라서 본 마이그레이션은 컬럼 추가 1건만 수행.
 *
 * 정책:
 *   - rejectionReason은 nullable. PENDING_REVIEW → REJECTED 전환 시 운영자가 입력.
 *   - 컬럼명은 camelCase quoted (lms_courses 기존 관례 따름: "instructorId", "isPublished" 등)
 *   - 기존 강의는 NULL 상태 유지 (회귀 0).
 */
export class AddRejectionReasonToLmsCourses20260503000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT NULL
    `);

    console.log('[Migration] lms_courses: added rejectionReason column');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        DROP COLUMN IF EXISTS "rejectionReason"
    `);
  }
}
