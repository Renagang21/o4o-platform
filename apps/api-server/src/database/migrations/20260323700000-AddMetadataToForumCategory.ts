import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FORUM-DELETE-REQUEST-V1
 *
 * forum_category에 metadata (jsonb) 컬럼 추가.
 * 삭제 요청 상태 등 확장 메타데이터를 저장하기 위함.
 */
export class AddMetadataToForumCategory20260323700000 implements MigrationInterface {
  name = 'AddMetadataToForumCategory20260323700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE forum_category
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE forum_category
      DROP COLUMN IF EXISTS metadata
    `);
  }
}
