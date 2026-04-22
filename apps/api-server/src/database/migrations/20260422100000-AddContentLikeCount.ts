/**
 * Migration: Add likeCount to cms_contents + backfill from cms_content_recommendations
 *
 * WO-KPA-CONTENT-LIKE-AND-SORT-V1:
 * - cms_contents에 "likeCount" 비정규화 컬럼 추가 (인기순 정렬용)
 * - 기존 cms_content_recommendations 데이터로 카운트 백필
 * - 인덱스 추가 (인기순 정렬 성능)
 *
 * 패턴: 20260210000001-AddContentViewCountAndRecommendations.ts 참조
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentLikeCount20260422100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add likeCount column (if not exists)
    const hasColumn = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cms_contents' AND column_name = 'likeCount'
    `);

    if (hasColumn.length === 0) {
      await queryRunner.query(
        `ALTER TABLE cms_contents ADD COLUMN "likeCount" INT NOT NULL DEFAULT 0`
      );
      console.log('[AddContentLikeCount] Added likeCount column to cms_contents.');
    } else {
      console.log('[AddContentLikeCount] likeCount column already exists, skipping.');
    }

    // 2. Backfill from cms_content_recommendations (if table exists)
    const recTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'cms_content_recommendations'
      ) AS "exists"
    `);

    if (recTableExists[0]?.exists) {
      const result = await queryRunner.query(`
        UPDATE cms_contents c
        SET "likeCount" = sub.cnt
        FROM (
          SELECT content_id, COUNT(*)::int as cnt
          FROM cms_content_recommendations
          GROUP BY content_id
        ) sub
        WHERE c.id = sub.content_id
      `);
      console.log(`[AddContentLikeCount] Backfilled likeCount for ${result?.[1] ?? '?'} rows.`);
    }

    // 3. Index for popular sort
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cms_contents_like_count
      ON cms_contents ("likeCount" DESC)
    `);
    console.log('[AddContentLikeCount] Created likeCount index.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cms_contents_like_count`);
    await queryRunner.query(`ALTER TABLE cms_contents DROP COLUMN IF EXISTS "likeCount"`);
  }
}
