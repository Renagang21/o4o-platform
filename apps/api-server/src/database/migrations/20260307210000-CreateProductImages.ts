import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NETURE-PRODUCT-IMAGE-STRUCTURE-V1
 *
 * product_images 테이블 생성 — ProductMaster 상품 이미지 관리
 */
export class CreateProductImages20260307210000 implements MigrationInterface {
  name = 'CreateProductImages20260307210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        master_id UUID NOT NULL REFERENCES product_masters(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        gcs_path TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_images_master_id ON product_images (master_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images (master_id, is_primary) WHERE is_primary = true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_images_primary`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_images_master_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_images`);
  }
}
