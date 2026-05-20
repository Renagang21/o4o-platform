import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-COURSE-APPROVAL-PUBLISH-STATUS-FIX-V1
 *
 * KPA 강의 요청 승인 시 lms_courses.status가 'draft'로 남던 버그 보정.
 *
 * 대상:
 *   - kpa_approval_requests.status = 'approved' + result_entity_id → lms_courses.status = 'draft'
 *   - kpa_course_requests.status = 'approved' + created_course_id → lms_courses.status = 'draft'
 */
export class BackfillApprovedKpaCourseStatus20261024000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. unified table (kpa_approval_requests)
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

    // 2. legacy table (kpa_course_requests)
    await queryRunner.query(`
      UPDATE lms_courses c
      SET
        status = 'published',
        "isPublished" = true,
        "publishedAt" = COALESCE(c."publishedAt", cr.reviewed_at, NOW())
      FROM kpa_course_requests cr
      WHERE cr.status = 'approved'
        AND cr.created_course_id = c.id
        AND c.status = 'draft'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 의도적으로 비워둠 — 이미 공개된 강의를 draft로 되돌리는 것은 운영상 안전하지 않음
  }
}
