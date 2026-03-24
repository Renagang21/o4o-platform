/**
 * WO-NETURE-IMAGE-ASSET-STRUCTURE-V1
 *
 * product_images 테이블에 type 컬럼 추가
 * - thumbnail: 대표 이미지 (master당 1개)
 * - detail: 상세 이미지 (다수)
 * - content: 성분/라벨 이미지 (다수)
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeToProductImages1711500000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. type 컬럼 추가 (기존 데이터는 'detail' 기본값)
    await queryRunner.query(`
      ALTER TABLE product_images
      ADD COLUMN IF NOT EXISTS type VARCHAR(16) NOT NULL DEFAULT 'detail'
    `);

    // 2. 기존 is_primary=true → type='thumbnail'로 동기화
    await queryRunner.query(`
      UPDATE product_images SET type = 'thumbnail' WHERE is_primary = true
    `);

    // 3. type 기반 조회 인덱스
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_images_type
      ON product_images (master_id, type)
    `);

    // 4. master당 thumbnail 최대 1개 — DB 레벨 강제
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_thumbnail_unique
      ON product_images (master_id) WHERE type = 'thumbnail'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_images_thumbnail_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_images_type`);
    await queryRunner.query(`ALTER TABLE product_images DROP COLUMN IF EXISTS type`);
  }
}
