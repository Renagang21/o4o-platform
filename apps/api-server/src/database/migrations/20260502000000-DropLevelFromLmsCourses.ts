import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-LMS-DROP-LEVEL-FIELD-V1
 *
 * lms_courses.level 컬럼 완전 제거.
 *
 * 사전 조건 (확인 완료):
 *   - 모든 UI에서 level 표시 제거 (WO-...-REMOVE-COURSE-LEVEL-DISPLAY-V1, -GLOBAL-V1)
 *   - FE에서 level 사용/전달 없음 (WO-...-REMOVE-COURSE-LEVEL-FIELD-V1)
 *   - API query param 제거 (WO-...-REMOVE-LEVEL-QUERY-PARAM-V1)
 *
 * 정책:
 *   - 데이터 보존 불필요. DROP COLUMN 즉시 실행.
 *   - down에서는 enum 타입 + 컬럼을 default 'beginner'로 복원.
 */
export class DropLevelFromLmsCourses20260502000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        DROP COLUMN IF EXISTS level
    `);

    // TypeORM이 자동 생성한 enum 타입(courses_level_enum 또는 lms_courses_level_enum)을
    // 정리. 명명 규칙이 환경마다 달라질 수 있어 둘 다 시도.
    await queryRunner.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS lms_courses_level_enum;
      EXCEPTION WHEN OTHERS THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS courses_level_enum;
      EXCEPTION WHEN OTHERS THEN NULL; END $$
    `);

    console.log('[Migration] lms_courses: dropped level column + enum type');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE lms_courses_level_enum AS ENUM ('beginner', 'intermediate', 'advanced');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        ADD COLUMN IF NOT EXISTS level lms_courses_level_enum NOT NULL DEFAULT 'beginner'
    `);
  }
}
