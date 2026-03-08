import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PARTNER-HUB-CORE-V2
 *
 * supplier_product_offers에 slug 컬럼 추가
 *
 * - SEO-friendly store URL: /store/{store_slug}/product/{product_slug}
 * - 기존 데이터는 UUID로 backfill
 * - 향후 공급자가 제품 등록 시 slug 직접 입력
 */
export class AddSlugToSupplierProductOffers20260308600000 implements MigrationInterface {
  name = 'AddSlugToSupplierProductOffers20260308600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add nullable column first
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
        ADD COLUMN IF NOT EXISTS slug VARCHAR(160)
    `);

    // Backfill existing rows with UUID
    await queryRunner.query(`
      UPDATE supplier_product_offers
        SET slug = id::text
        WHERE slug IS NULL
    `);

    // Set NOT NULL
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
        ALTER COLUMN slug SET NOT NULL
    `);

    // Unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_spo_slug
        ON supplier_product_offers (slug)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spo_slug`);
    await queryRunner.query(`ALTER TABLE supplier_product_offers DROP COLUMN IF EXISTS slug`);
  }
}
