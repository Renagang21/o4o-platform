import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1
 *
 * lms_courses에 content_kind 컬럼 추가.
 *   - 'lecture'         : /instructor/courses/new에서 만든 일반 강의 (기본값)
 *   - 'content_resource': /content/courses/new에서 만든 코스형 자료
 *
 * 기존 모든 row는 NOT NULL DEFAULT 'lecture'로 자동 백필됨 → 별도 수동 이관 불필요.
 *
 * 컬럼명은 사용자 WO 명시(content_kind, snake_case)를 따른다. 기존 lms_courses
 * 컬럼은 대부분 camelCase quoted(`"isPaid"`, `"isPublished"` 등)지만, content_kind는
 * 새 분류 축이므로 snake_case 단일 단어로 통일한다. Entity에서 @Column({ name: 'content_kind' })로
 * 매핑한다.
 */
export class AddContentKindToLmsCourses20260906000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        ADD COLUMN IF NOT EXISTS content_kind VARCHAR(30) NOT NULL DEFAULT 'lecture'
    `);

    // 방어적 백필 — DEFAULT 적용으로 NULL row는 없겠지만 안전망
    await queryRunner.query(`
      DO $$ BEGIN
        UPDATE lms_courses SET content_kind = 'lecture' WHERE content_kind IS NULL;
      EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lms_courses_content_kind ON lms_courses(content_kind)
    `);

    console.log('[Migration] lms_courses: added content_kind + idx_lms_courses_content_kind');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lms_courses_content_kind`);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        DROP COLUMN IF EXISTS content_kind
    `);
  }
}
