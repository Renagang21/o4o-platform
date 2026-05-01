import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1
 *
 * lms_courses에 visibility 컬럼 추가.
 *   - 'public'  : 공개 강의 (목록/상세 노출. 비로그인 접근 정책은 별도 WO에서 처리)
 *   - 'members' : 회원제 강의 (기본값. 로그인 회원만)
 *
 * 기존 모든 row는 NOT NULL DEFAULT 'members'로 자동 백필됨.
 * 컬럼명은 snake_case 단일 단어. Entity에서는 @Column({ name: 'visibility' })로 매핑.
 */
export class AddVisibilityToLmsCourses20260501000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'members'
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        UPDATE lms_courses SET visibility = 'members' WHERE visibility IS NULL;
      EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lms_courses_visibility ON lms_courses(visibility)
    `);

    console.log('[Migration] lms_courses: added visibility + idx_lms_courses_visibility');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lms_courses_visibility`);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        DROP COLUMN IF EXISTS visibility
    `);
  }
}
