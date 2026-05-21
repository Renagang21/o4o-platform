import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-COURSE-SERVICEKEY-V1
 *
 * lms_courses 테이블에 service_key 컬럼 추가.
 * Course의 서비스 소유권을 명시하여 Cross-service operator 접근을 차단한다.
 *
 * 값 기준: service_memberships.service_key canonical key
 *   (예: 'kpa-society', 'k-cosmetics', 'glycopharm', 'neture')
 * NULL = legacy / platform-wide course (모든 operator 접근 허용, backward compat).
 *
 * 신규 강의 생성 시 CourseController가 creator의 service_memberships에서 자동 도출.
 */
export class AddCourseServiceKey1771200000027 implements MigrationInterface {
  name = 'AddCourseServiceKey1771200000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS service_key VARCHAR(100)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lms_courses_service_key
        ON lms_courses (service_key)
        WHERE service_key IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lms_courses_service_key`);
    await queryRunner.query(`ALTER TABLE lms_courses DROP COLUMN IF EXISTS service_key`);
  }
}
