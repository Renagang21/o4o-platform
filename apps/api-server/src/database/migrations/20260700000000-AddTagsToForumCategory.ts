import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-FORUM-TAG-TO-CATEGORY-PROPAGATION-V1
 *
 * 1. forum_category.tags TEXT[] 컬럼 추가
 *    - 승인 시 ForumCategoryRequest.tags → ForumCategory.tags 1회 복사 지원
 *    - 기존 row는 NULL 유지 (백필 없음)
 *
 * 2. forum_category_requests.tags 컬럼은 이미 TEXT[]로 생성되어 있음
 *    - TypeORM 엔티티의 simple-array → type:'text',array:true 교정만 필요
 *    - DB 스키마 변경 불필요
 */
export class AddTagsToForumCategory20260700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE forum_category
      ADD COLUMN IF NOT EXISTS tags TEXT[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE forum_category
      DROP COLUMN IF EXISTS tags
    `);
  }
}
