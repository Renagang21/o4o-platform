/**
 * Migration: Add Performance Indexes to forum_post
 *
 * 홈 페이지 커뮤니티 쿼리 성능 최적화.
 * - status + organization_id + created_at DESC: 홈 페이지 최근 글 조회
 * - author_id: users 테이블 JOIN 최적화
 */

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddForumPostPerformanceIndexes1739353200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 홈 페이지 쿼리: WHERE status='publish' AND organization_id IS NULL ORDER BY created_at DESC
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_FORUM_POST_STATUS_ORG_CREATED"
       ON "forum_post" ("status", "organization_id", "created_at" DESC)`
    );

    // users JOIN 최적화
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_FORUM_POST_AUTHOR"
       ON "forum_post" ("author_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_FORUM_POST_STATUS_ORG_CREATED"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_FORUM_POST_AUTHOR"`);
  }
}
