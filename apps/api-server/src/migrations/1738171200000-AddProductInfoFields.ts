import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add Product Info Fields Migration
 *
 * WO-PRODUCT-DB-CLEANUP-FOR-SITE-V1
 * Adds fields to product tables for site normalization:
 * - subtitle, shortDescription for listing/detail
 * - manufacturer, originCountry, legalCategory, certificationIds (legal info)
 * - usageInfo, cautionInfo (product details)
 * - sku, barcodes (identification - Product DB Constitution v1)
 *
 * Tables: cosmetics_products, neture_products, glycopharm_products
 */
export class AddProductInfoFields1738171200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // 1. cosmetics_products (schema: cosmetics)
    // ========================================================================

    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_products
      ADD COLUMN IF NOT EXISTS subtitle VARCHAR(500),
      ADD COLUMN IF NOT EXISTS short_description TEXT,
      ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(200),
      ADD COLUMN IF NOT EXISTS origin_country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS legal_category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS certification_ids JSONB,
      ADD COLUMN IF NOT EXISTS usage_info TEXT,
      ADD COLUMN IF NOT EXISTS caution_info TEXT,
      ADD COLUMN IF NOT EXISTS sku VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS barcodes JSONB
    `);

    // Create index for sku
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cosmetics_products_sku"
      ON cosmetics.cosmetics_products (sku)
    `);

    // ========================================================================
    // 2. neture_products (schema: neture)
    // ========================================================================

    await queryRunner.query(`
      ALTER TABLE neture.neture_products
      ADD COLUMN IF NOT EXISTS short_description TEXT,
      ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(200),
      ADD COLUMN IF NOT EXISTS origin_country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS legal_category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS certification_ids JSONB,
      ADD COLUMN IF NOT EXISTS usage_info TEXT,
      ADD COLUMN IF NOT EXISTS caution_info TEXT,
      ADD COLUMN IF NOT EXISTS barcodes JSONB
    `);

    // Update sku to be unique and indexed (if exists)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_neture_products_sku_unique"
      ON neture.neture_products (sku)
      WHERE sku IS NOT NULL
    `);

    // ========================================================================
    // 3. glycopharm_products (schema: public)
    // ========================================================================

    await queryRunner.query(`
      ALTER TABLE public.glycopharm_products
      ADD COLUMN IF NOT EXISTS subtitle VARCHAR(500),
      ADD COLUMN IF NOT EXISTS short_description TEXT,
      ADD COLUMN IF NOT EXISTS origin_country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS legal_category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS certification_ids JSONB,
      ADD COLUMN IF NOT EXISTS usage_info TEXT,
      ADD COLUMN IF NOT EXISTS caution_info TEXT,
      ADD COLUMN IF NOT EXISTS barcodes JSONB
    `);

    // Note: glycopharm_products already has manufacturer and sku columns
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // Rollback: Drop added columns in reverse order
    // ========================================================================

    // 1. cosmetics_products
    await queryRunner.query(`DROP INDEX IF EXISTS cosmetics."IDX_cosmetics_products_sku"`);
    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_products
      DROP COLUMN IF EXISTS barcodes,
      DROP COLUMN IF EXISTS sku,
      DROP COLUMN IF EXISTS caution_info,
      DROP COLUMN IF EXISTS usage_info,
      DROP COLUMN IF EXISTS certification_ids,
      DROP COLUMN IF EXISTS legal_category,
      DROP COLUMN IF EXISTS origin_country,
      DROP COLUMN IF EXISTS manufacturer,
      DROP COLUMN IF EXISTS short_description,
      DROP COLUMN IF EXISTS subtitle
    `);

    // 2. neture_products
    await queryRunner.query(`DROP INDEX IF EXISTS neture."IDX_neture_products_sku_unique"`);
    await queryRunner.query(`
      ALTER TABLE neture.neture_products
      DROP COLUMN IF EXISTS barcodes,
      DROP COLUMN IF EXISTS caution_info,
      DROP COLUMN IF EXISTS usage_info,
      DROP COLUMN IF EXISTS certification_ids,
      DROP COLUMN IF EXISTS legal_category,
      DROP COLUMN IF EXISTS origin_country,
      DROP COLUMN IF EXISTS manufacturer,
      DROP COLUMN IF EXISTS short_description
    `);

    // 3. glycopharm_products
    await queryRunner.query(`
      ALTER TABLE public.glycopharm_products
      DROP COLUMN IF EXISTS barcodes,
      DROP COLUMN IF EXISTS caution_info,
      DROP COLUMN IF EXISTS usage_info,
      DROP COLUMN IF EXISTS certification_ids,
      DROP COLUMN IF EXISTS legal_category,
      DROP COLUMN IF EXISTS origin_country,
      DROP COLUMN IF EXISTS short_description,
      DROP COLUMN IF EXISTS subtitle
    `);
  }
}
