import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gate 3-Fix-1: Create Materialized View and Refresh Function
 *
 * Purpose:
 * - Stop the repeated "refresh_product_listings() does not exist" error
 * - Create mv_product_listings for dropshipping product caching
 * - Based on actual dropshipping_* tables (not legacy products table)
 *
 * This migration is safe to run on production as it uses IF NOT EXISTS
 */
export class CreateProductListingsMV9950000000000 implements MigrationInterface {
  name = 'CreateProductListingsMV9950000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Enable pg_trgm extension if not exists (for text search)
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `);

    // Step 2: Create Materialized View for Product Listings
    // Based on actual dropshipping tables:
    // - dropshipping_product_masters
    // - dropshipping_supplier_product_offers
    // - dropshipping_seller_listings
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_listings AS
      SELECT
        pm.id AS product_id,
        pm.name AS product_name,
        pm.sku AS product_sku,
        pm.brand AS brand,
        pm.category AS category,
        pm.status AS product_status,
        pm.images AS images,
        pm."createdAt" AS created_at,
        pm."updatedAt" AS updated_at,
        -- Supplier Offer info
        spo.id AS offer_id,
        spo."supplierId" AS supplier_id,
        spo."supplierPrice" AS supplier_price,
        spo."recommendedPrice" AS recommended_price,
        spo."stockQty" AS stock_qty,
        spo.status AS offer_status,
        -- Seller Listing info (if exists)
        sl.id AS listing_id,
        sl."sellerId" AS seller_id,
        sl."sellingPrice" AS selling_price,
        sl.status AS listing_status,
        sl.channel AS channel,
        -- Computed fields
        CASE
          WHEN spo."stockQty" > 0 THEN true
          ELSE false
        END AS in_stock,
        CASE
          WHEN spo."recommendedPrice" IS NOT NULL AND spo."recommendedPrice" > 0 AND spo."supplierPrice" > 0
          THEN ROUND(((spo."recommendedPrice" - spo."supplierPrice") / spo."recommendedPrice" * 100)::numeric, 2)
          ELSE 0
        END AS margin_percentage
      FROM dropshipping_product_masters pm
      LEFT JOIN dropshipping_supplier_product_offers spo
        ON spo."productMasterId" = pm.id
      LEFT JOIN dropshipping_seller_listings sl
        ON sl."offerId" = spo.id
      WHERE pm.status IN ('active', 'out_of_stock');
    `);

    // Step 3: Create unique index on product_id for CONCURRENTLY refresh
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS mv_product_listings_product_id_idx
      ON mv_product_listings (product_id, COALESCE(offer_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid));
    `);

    // Step 4: Create additional indexes for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS mv_product_listings_supplier_idx
      ON mv_product_listings (supplier_id, offer_status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS mv_product_listings_seller_idx
      ON mv_product_listings (seller_id, listing_status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS mv_product_listings_category_idx
      ON mv_product_listings (category, product_status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS mv_product_listings_stock_idx
      ON mv_product_listings (in_stock, product_status);
    `);

    // Step 5: Create refresh function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_product_listings()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_listings;
      EXCEPTION
        WHEN OTHERS THEN
          -- If CONCURRENTLY fails (e.g., no unique index), try regular refresh
          RAISE NOTICE 'Concurrent refresh failed, trying regular refresh: %', SQLERRM;
          REFRESH MATERIALIZED VIEW mv_product_listings;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Step 6: Analyze for query planner optimization
    await queryRunner.query(`
      ANALYZE mv_product_listings;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order
    await queryRunner.query(`DROP FUNCTION IF EXISTS refresh_product_listings();`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS mv_product_listings;`);
  }
}
