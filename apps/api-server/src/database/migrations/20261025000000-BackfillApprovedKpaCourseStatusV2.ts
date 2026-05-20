import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-COURSE-APPROVAL-PUBLISH-STATUS-FIX-V1 (V2 재실행)
 *
 * V1(20261024000000)이 TypeORM migration 레코드만 기록되고 실제 UPDATE는
 * ROLLBACK되어 적용되지 않은 건 재처리.
 *
 * kpa_course_requests 테이블은 프로덕션에 없으므로 제외.
 * kpa_approval_requests 경로만 처리.
 */
export class BackfillApprovedKpaCourseStatusV220261025000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE lms_courses c
      SET
        status = 'published',
        "isPublished" = true,
        "publishedAt" = COALESCE(c."publishedAt", ar.reviewed_at, NOW())
      FROM kpa_approval_requests ar
      WHERE ar.entity_type = 'course'
        AND ar.status = 'approved'
        AND ar.result_entity_id = c.id
        AND c.status = 'draft'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 의도적으로 비워둠 — 이미 공개된 강의를 draft로 되돌리는 것은 운영상 안전하지 않음
  }
}
