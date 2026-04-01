import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-COMMON-MEDIA-FOLDER-AND-LIBRARY-MANAGEMENT-V1
 * media_assets 테이블에 folder 컬럼 추가 (1단계 폴더 분류)
 */
export class AddMediaAssetFolder20260401400000 implements MigrationInterface {
  name = 'AddMediaAssetFolder20260401400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE media_assets
      ADD COLUMN IF NOT EXISTS folder VARCHAR(50) DEFAULT 'general'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_media_assets_folder ON media_assets (folder)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_media_assets_folder`);
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS folder`);
  }
}
