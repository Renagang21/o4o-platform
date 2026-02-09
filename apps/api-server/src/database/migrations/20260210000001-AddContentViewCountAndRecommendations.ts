/**
 * Migration: Add viewCount to cms_contents + Create cms_content_recommendations
 *
 * WO-CONTENT-LIST-UX-PHASE3A-V1:
 * - cms_contents에 "viewCount" 컬럼 추가 (조회수)
 * - cms_content_recommendations 테이블 생성 (추천 시스템, 1인 1추천)
 *
 * 패턴: 2026020600001-CreateForumPostLikeTable.ts 참조
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class AddContentViewCountAndRecommendations20260210000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add viewCount column to cms_contents (if not exists)
    const hasViewCount = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cms_contents' AND column_name = 'viewCount'
    `);

    if (hasViewCount.length === 0) {
      await queryRunner.query(
        `ALTER TABLE cms_contents ADD COLUMN "viewCount" INT NOT NULL DEFAULT 0`
      );
      console.log('[AddContentViewCountAndRecommendations] Added viewCount column to cms_contents.');
    } else {
      console.log('[AddContentViewCountAndRecommendations] viewCount column already exists, skipping.');
    }

    // 2. Create cms_content_recommendations table (if not exists)
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'cms_content_recommendations'
      ) AS "exists";
    `);

    if (tableExists[0]?.exists) {
      console.log('[AddContentViewCountAndRecommendations] cms_content_recommendations table already exists, skipping.');
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'cms_content_recommendations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'content_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'cms_content_recommendations',
      new TableIndex({ columnNames: ['content_id'] }),
    );

    await queryRunner.createIndex(
      'cms_content_recommendations',
      new TableIndex({ columnNames: ['user_id'] }),
    );

    await queryRunner.createUniqueConstraint(
      'cms_content_recommendations',
      new TableUnique({ columnNames: ['content_id', 'user_id'] }),
    );

    console.log('[AddContentViewCountAndRecommendations] Created cms_content_recommendations table.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('cms_content_recommendations', true);
    await queryRunner.query(`ALTER TABLE cms_contents DROP COLUMN IF EXISTS "viewCount"`);
  }
}
