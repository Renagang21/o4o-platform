import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-PRICE-ARCHITECTURE-FREEZE-V1
 *
 * Product 중심 B2B 가격 구조 확립.
 * - NetureSupplierProduct에 B2B 가격 필드 추가
 * - Listing/Channel에서 분산 가격 컬럼 제거
 */
export class NeturePriceArchitectureFreeze1740700801000 implements MigrationInterface {
  name = 'NeturePriceArchitectureFreeze1740700801000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step A: Add B2B price columns to product
    await queryRunner.query(`
      ALTER TABLE neture_supplier_products
        ADD COLUMN IF NOT EXISTS price_general INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS price_gold INT NULL,
        ADD COLUMN IF NOT EXISTS price_platinum INT NULL,
        ADD COLUMN IF NOT EXISTS consumer_reference_price INT NULL
    `);

    // Step B: Drop distributed price columns
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        DROP COLUMN IF EXISTS retail_price
    `);

    await queryRunner.query(`
      ALTER TABLE organization_product_channels
        DROP COLUMN IF EXISTS channel_price
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore distributed price columns
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        ADD COLUMN retail_price INT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE organization_product_channels
        ADD COLUMN channel_price INT NULL
    `);

    // Remove B2B price columns
    await queryRunner.query(`
      ALTER TABLE neture_supplier_products
        DROP COLUMN IF EXISTS price_general,
        DROP COLUMN IF EXISTS price_gold,
        DROP COLUMN IF EXISTS price_platinum,
        DROP COLUMN IF EXISTS consumer_reference_price
    `);
  }
}
