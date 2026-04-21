/**
 * AddContentMetaToLibraryItems
 *
 * WO-NETURE-SUPPLIER-CONTENT-TABLE-MERGE-V1
 *
 * ContentMeta 구조를 DB 레벨까지 완성:
 * - content_type: 'media' (기본, 파일) / 'document' (향후, 블록 콘텐츠)
 * - visibility: is_public에서 파생 ('service' / 'personal')
 * - blocks: JSONB, document 타입 전용
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentMetaToLibraryItems20260421100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // content_type: 기본 'media' (기존 항목 모두 파일 기반)
    await queryRunner.query(`
      ALTER TABLE neture_supplier_library_items
        ADD COLUMN content_type VARCHAR(50) NOT NULL DEFAULT 'media'
    `);

    // visibility: 기본 'personal' (is_public=false 기본값과 일치)
    await queryRunner.query(`
      ALTER TABLE neture_supplier_library_items
        ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'personal'
    `);

    // blocks: document 타입 전용 JSONB (media는 null)
    await queryRunner.query(`
      ALTER TABLE neture_supplier_library_items
        ADD COLUMN blocks JSONB
    `);

    // 기존 데이터 backfill: is_public → visibility
    await queryRunner.query(`
      UPDATE neture_supplier_library_items
        SET visibility = CASE WHEN is_public = true THEN 'service' ELSE 'personal' END
    `);

    // 인덱스
    await queryRunner.query(`
      CREATE INDEX idx_nsli_content_type ON neture_supplier_library_items (content_type)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_nsli_visibility ON neture_supplier_library_items (visibility)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_nsli_visibility`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_nsli_content_type`);
    await queryRunner.query(`ALTER TABLE neture_supplier_library_items DROP COLUMN IF EXISTS blocks`);
    await queryRunner.query(`ALTER TABLE neture_supplier_library_items DROP COLUMN IF EXISTS visibility`);
    await queryRunner.query(`ALTER TABLE neture_supplier_library_items DROP COLUMN IF EXISTS content_type`);
  }
}
