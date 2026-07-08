import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1
 *
 * Additive migration. media_assets 에 Content Resource 서술 메타데이터 컬럼 추가.
 * 전부 nullable, backfill 없음, idempotent(IF NOT EXISTS). 기존 컬럼/데이터 무변경.
 *
 * 재사용(추가 안 함): uploaded_by(=createdBy) · is_library_public(=visibility) · asset_type(=type) · created_at/updated_at.
 * 신규: title/description/tags/keywords/language/source/usage_type/status/memo/updated_by.
 * 파일 속성(url/gcs_path/file_name/original_name)과 분리된 Resource 속성이며 URL 불변.
 */
export class AddMediaAssetMetadata20261222000000 implements MigrationInterface {
  name = 'AddMediaAssetMetadata20261222000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS title varchar(300) NULL`);
    await queryRunner.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS description text NULL`);
    await queryRunner.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS tags jsonb NULL`);
    await queryRunner.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS keywords jsonb NULL`);
    await queryRunner.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS language varchar(10) NULL`);
    await queryRunner.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS source varchar(50) NULL`);
    await queryRunner.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS usage_type varchar(50) NULL`);
    await queryRunner.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS status varchar(50) NULL`);
    await queryRunner.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS memo text NULL`);
    await queryRunner.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS updated_by uuid NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS updated_by`);
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS memo`);
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS status`);
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS usage_type`);
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS source`);
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS language`);
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS keywords`);
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS tags`);
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS description`);
    await queryRunner.query(`ALTER TABLE media_assets DROP COLUMN IF EXISTS title`);
  }
}
