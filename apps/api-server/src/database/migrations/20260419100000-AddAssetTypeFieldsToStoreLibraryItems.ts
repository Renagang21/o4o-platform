import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-STORE-LIBRARY-ASSET-EXTENSION-V1
 *
 * store_library_items 테이블에 멀티 에셋 타입 지원 컬럼 추가:
 *   - asset_type: 'file' | 'content' | 'external-link' (기본값 'file')
 *   - url: 외부 링크 URL (external-link 타입용)
 *   - html_content: 리치 텍스트 HTML (content 타입용)
 *   - source_type: 자료 출처 ('uploaded' | 'neture-prefill' | 'manual')
 */
export class AddAssetTypeFieldsToStoreLibraryItems20260419100000 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // asset_type — 기본값 'file'로 기존 데이터 호환
    await queryRunner.query(`
      ALTER TABLE store_library_items
      ADD COLUMN IF NOT EXISTS asset_type VARCHAR(50) NOT NULL DEFAULT 'file'
    `);

    // url — external-link 타입에서 사용
    await queryRunner.query(`
      ALTER TABLE store_library_items
      ADD COLUMN IF NOT EXISTS url VARCHAR(1000) DEFAULT NULL
    `);

    // html_content — content 타입에서 사용 (sanitized HTML)
    await queryRunner.query(`
      ALTER TABLE store_library_items
      ADD COLUMN IF NOT EXISTS html_content TEXT DEFAULT NULL
    `);

    // source_type — 자료 출처 구분
    await queryRunner.query(`
      ALTER TABLE store_library_items
      ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) NOT NULL DEFAULT 'uploaded'
    `);

    // 부분 인덱스: organization_id + asset_type (active 항목만)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_library_items_asset_type"
      ON store_library_items (organization_id, asset_type)
      WHERE is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_library_items_asset_type"`);
    await queryRunner.query(`ALTER TABLE store_library_items DROP COLUMN IF EXISTS source_type`);
    await queryRunner.query(`ALTER TABLE store_library_items DROP COLUMN IF EXISTS html_content`);
    await queryRunner.query(`ALTER TABLE store_library_items DROP COLUMN IF EXISTS url`);
    await queryRunner.query(`ALTER TABLE store_library_items DROP COLUMN IF EXISTS asset_type`);
  }
}
