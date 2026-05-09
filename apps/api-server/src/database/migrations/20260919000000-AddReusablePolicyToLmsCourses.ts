import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1
 *
 * lms_courses에 reusable_policy 컬럼 추가.
 *   - 'restricted'  : 본인/소속 강의자만 (신규 default — 매장 자료함 가져가기 차단)
 *   - 'organization': 동일 organizationId 매장만 가져갈 수 있음 (Phase 2에서 활성화)
 *   - 'platform'    : 모든 매장 가져갈 수 있음
 *
 * 본 정책은 `visibility`(수강 접근성)와 독립된 별개 축이다 — 두 축을 혼동하지 말 것.
 *
 * 기존 강의 백필:
 *   현재 운영중인 강의가 자료함 사용에서 막히지 않도록, 기존 row(이 마이그레이션 실행 시점에
 *   이미 존재하는 row)는 모두 'platform'으로 백필한다. 신규 강의는 default 'restricted'로
 *   생성되며, 강사가 명시적으로 변경할 수 있다.
 *
 * 컬럼명은 snake_case(reusable_policy)로 통일 — content_kind와 동일한 컨벤션.
 * Entity에서는 @Column({ name: 'reusable_policy' })로 매핑한다.
 */
export class AddReusablePolicyToLmsCourses20260919000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        ADD COLUMN IF NOT EXISTS reusable_policy VARCHAR(20) NOT NULL DEFAULT 'restricted'
    `);

    // 기존 강의 백필 — 운영중 강의가 자료함에서 막히지 않도록 platform으로 처리.
    // 컬럼이 방금 추가됐다면 모든 row가 default 'restricted'이므로, 현재 시각보다 작은 "createdAt"
    // (=마이그레이션 이전 생성된 row)을 한 번만 platform으로 백필. lms_courses의 createdAt은
    // camelCase quoted 컬럼이다.
    await queryRunner.query(`
      DO $$ BEGIN
        UPDATE lms_courses
           SET reusable_policy = 'platform'
         WHERE reusable_policy = 'restricted'
           AND "createdAt" < NOW();
      EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lms_courses_reusable_policy ON lms_courses(reusable_policy)
    `);

    console.log('[Migration] lms_courses: added reusable_policy + idx_lms_courses_reusable_policy (existing rows backfilled to platform)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lms_courses_reusable_policy`);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_courses
        DROP COLUMN IF EXISTS reusable_policy
    `);
  }
}
