import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-COMMON-MEDIA-LIBRARY-FOUNDATION-V1
 * 공용 미디어 라이브러리 자산 테이블
 */
export class CreateMediaAssetsTable20260401300000 implements MigrationInterface {
  name = 'CreateMediaAssetsTable20260401300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        url TEXT NOT NULL,
        gcs_path TEXT NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        original_name VARCHAR(500) NOT NULL,
        mime_type VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL DEFAULT 0,
        asset_type VARCHAR(50) NOT NULL DEFAULT 'image',
        width INT,
        height INT,
        service_key VARCHAR(100),
        uploaded_by UUID,
        is_library_public BOOLEAN NOT NULL DEFAULT true,
        consented_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_media_assets_uploaded_by ON media_assets (uploaded_by)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_media_assets_asset_type ON media_assets (asset_type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_media_assets_created_at ON media_assets (created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_media_assets_service_key ON media_assets (service_key)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS media_assets`);
  }
}
