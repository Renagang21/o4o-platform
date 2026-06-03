import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-COURSE-SERVICEKEY-V1 (schema catch-up)
 *
 * Course 엔티티(@o4o/interactive-content-core)는 cross-service operator 접근 제어용
 * `service_key` 컬럼(@Column({ name: 'service_key' }))을 선언하지만, 이를 실제
 * `lms_courses` 테이블에 추가하는 마이그레이션이 누락되어 있었다.
 * 그 결과 course 관계를 로드하는 모든 쿼리(예: /mypage/certificates 의 수료증 조회 →
 * leftJoinAndSelect('certificate.course','course'))가
 *   ERROR: column course.service_key does not exist
 * 로 실패했다. 본 마이그레이션이 누락된 컬럼을 추가한다.
 *
 * 백필: 기존 강좌는 KPA-Society LMS(공통 구조 reference implementation) 기원이며,
 * CourseService 의 event-log fallback 도 `serviceKey ?? 'kpa-society'` 이므로
 * 기존 NULL row 를 'kpa-society' 로 백필한다. null 은 legacy/platform-wide 의미를
 * 유지하지만, 운영 일관성을 위해 기존 데이터에 명시 service_key 를 부여한다.
 *
 * up() 은 멱등(IF NOT EXISTS) 이므로 수동 복구된 환경에 재실행돼도 안전하다.
 * 컬럼 길이는 엔티티 정의(VARCHAR(100)) 와 일치시킨다.
 */
export class AddServiceKeyToLmsCourses20261101000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        ADD COLUMN IF NOT EXISTS service_key VARCHAR(100)
    `);

    // 기존 강좌(NULL)를 KPA-Society 로 백필 — undefined_table/column 방어
    await queryRunner.query(`
      DO $$ BEGIN
        UPDATE lms_courses SET service_key = 'kpa-society' WHERE service_key IS NULL;
      EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$
    `);

    // cross-service operator 필터링용 인덱스
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lms_courses_service_key ON lms_courses(service_key)
    `);

    console.log('[Migration] lms_courses: added service_key + idx_lms_courses_service_key (backfill → kpa-society)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lms_courses_service_key`);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        DROP COLUMN IF EXISTS service_key
    `);
  }
}
