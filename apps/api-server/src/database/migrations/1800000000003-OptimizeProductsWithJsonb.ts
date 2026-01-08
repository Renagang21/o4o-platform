import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1: JSONB Optimization for Products Table
 *
 * Performance Goals:
 * - 100만 상품까지 안정적 성능 (20-50ms)
 * - 벤치마크 결과: JSONB + Materialized View = 0.141ms avg
 *
 * Changes:
 * 1. Convert JSON columns to JSONB
 * 2. Add GIN indexes for JSONB fields
 * 3. Optimize existing indexes
 * 4. Create materialized view for product listings
 */
export class OptimizeProductsWithJsonb1800000000003 implements MigrationInterface {
  name = 'OptimizeProductsWithJsonb1800000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Skip if products table doesn't exist
    const hasTable = await queryRunner.hasTable('products');
    if (!hasTable) {
      console.log('Skipping OptimizeProductsWithJsonb: products table does not exist');
      return;
    }

    // Step 1: Convert JSON columns to JSONB

    await queryRunner.query(`
      -- Convert images column
      ALTER TABLE products
      ALTER COLUMN images TYPE jsonb USING images::jsonb;
    `);

    await queryRunner.query(`
      -- Convert variants column
      ALTER TABLE products
      ALTER COLUMN variants TYPE jsonb USING variants::jsonb;
    `);

    await queryRunner.query(`
      -- Convert dimensions column
      ALTER TABLE products
      ALTER COLUMN dimensions TYPE jsonb USING dimensions::jsonb;
    `);

    await queryRunner.query(`
      -- Convert shipping column
      ALTER TABLE products
      ALTER COLUMN shipping TYPE jsonb USING shipping::jsonb;
    `);

    await queryRunner.query(`
      -- Convert seo column
      ALTER TABLE products
      ALTER COLUMN seo TYPE jsonb USING seo::jsonb;
    `);

    await queryRunner.query(`
      -- Convert tierPricing column
      ALTER TABLE products
      ALTER COLUMN "tierPricing" TYPE jsonb USING "tierPricing"::jsonb;
    `);

    await queryRunner.query(`
      -- Convert metadata column
      ALTER TABLE products
      ALTER COLUMN metadata TYPE jsonb USING metadata::jsonb;
    `);

    // Step 2: Add GIN indexes for JSONB fields

    await queryRunner.query(`
      -- Index for searching within images
      CREATE INDEX IF NOT EXISTS idx_products_images_gin
      ON products USING GIN (images);
    `);

    await queryRunner.query(`
      -- Index for variant searches
      CREATE INDEX IF NOT EXISTS idx_products_variants_gin
      ON products USING GIN (variants);
    `);

    await queryRunner.query(`
      -- Index for SEO searches
      CREATE INDEX IF NOT EXISTS idx_products_seo_gin
      ON products USING GIN (seo);
    `);

    await queryRunner.query(`
      -- Index for metadata searches
      CREATE INDEX IF NOT EXISTS idx_products_metadata_gin
      ON products USING GIN (metadata);
    `);

    // Step 3: Add specific JSONB path indexes for common queries

    await queryRunner.query(`
      -- Index for main image URL (commonly accessed)
      CREATE INDEX IF NOT EXISTS idx_products_images_main
      ON products ((images->'main'));
    `);

    await queryRunner.query(`
      -- Index for SEO slug (used in URLs)
      CREATE INDEX IF NOT EXISTS idx_products_seo_slug
      ON products ((seo->>'slug'));
    `);

    await queryRunner.query(`
      -- Index for brand (common filter)
      CREATE INDEX IF NOT EXISTS idx_products_brand_lower
      ON products (LOWER(brand));
    `);

    // Step 4: Create materialized view for product listings

    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_listings AS
      SELECT
        p.id,
        p."supplierId",
        p."categoryId",
        p.name,
        p.sku,
        p.slug,
        p.type,
        p.status,
        p."isActive",
        p."supplierPrice",
        p."recommendedPrice",
        p."comparePrice",
        p.currency,
        p.inventory,
        p."trackInventory",
        p.brand,
        p.images->'main' as main_image,
        p.seo->>'slug' as seo_slug,
        p."createdAt",
        p."updatedAt",
        p."publishedAt",
        -- Computed fields for faster access
        CASE
          WHEN p."comparePrice" IS NOT NULL AND p."comparePrice" > p."recommendedPrice"
          THEN ROUND(((p."comparePrice" - p."recommendedPrice") / p."comparePrice" * 100)::numeric, 0)
          ELSE 0
        END as discount_percentage,
        CASE
          WHEN p."trackInventory" = true THEN p.inventory > 0
          ELSE true
        END as in_stock,
        -- Category info (denormalized)
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      WHERE p.status IN ('active', 'out_of_stock')
        AND p."isActive" = true;
    `);

    // Step 5: Create indexes on materialized view

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS mv_product_listings_id_idx
      ON mv_product_listings (id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS mv_product_listings_supplier_idx
      ON mv_product_listings ("supplierId", status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS mv_product_listings_category_idx
      ON mv_product_listings ("categoryId", status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS mv_product_listings_status_created_idx
      ON mv_product_listings (status, "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS mv_product_listings_brand_idx
      ON mv_product_listings (LOWER(brand));
    `);

    await queryRunner.query(`
      -- Full-text search index on product name
      CREATE INDEX IF NOT EXISTS mv_product_listings_name_trgm_idx
      ON mv_product_listings USING gin (name gin_trgm_ops);
    `);

    // Step 6: Create function to refresh materialized view

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_product_listings()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_listings;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Step 7: Analyze tables for query planner
    await queryRunner.query(`
      ANALYZE products;
      ANALYZE mv_product_listings;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Skip if products table doesn't exist
    const hasTable = await queryRunner.hasTable('products');
    if (!hasTable) {
      return;
    }

    // Drop materialized view and related objects
    await queryRunner.query(`DROP FUNCTION IF EXISTS refresh_product_listings();`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS mv_product_listings;`);

    // Drop JSONB indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_images_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_variants_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_seo_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_metadata_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_images_main;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_seo_slug;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_brand_lower;`);

    // Convert JSONB back to JSON (if needed for rollback)
    await queryRunner.query(`ALTER TABLE products ALTER COLUMN images TYPE json USING images::json;`);
    await queryRunner.query(`ALTER TABLE products ALTER COLUMN variants TYPE json USING variants::json;`);
    await queryRunner.query(`ALTER TABLE products ALTER COLUMN dimensions TYPE json USING dimensions::json;`);
    await queryRunner.query(`ALTER TABLE products ALTER COLUMN shipping TYPE json USING shipping::json;`);
    await queryRunner.query(`ALTER TABLE products ALTER COLUMN seo TYPE json USING seo::json;`);
    await queryRunner.query(`ALTER TABLE products ALTER COLUMN "tierPricing" TYPE json USING "tierPricing"::json;`);
    await queryRunner.query(`ALTER TABLE products ALTER COLUMN metadata TYPE json USING metadata::json;`);
  }
}
