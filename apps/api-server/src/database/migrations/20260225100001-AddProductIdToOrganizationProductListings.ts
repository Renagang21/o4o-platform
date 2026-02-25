import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-PRODUCT-POLICY-V2-DATA-LAYER-INTRODUCTION-V1 — Phase 2
 *
 * Adds:
 * - product_id (UUID, nullable) column to organization_product_listings
 * - FK → neture_supplier_products(id) ON DELETE SET NULL
 * - Index on product_id
 *
 * Additive only — existing columns (external_product_id etc.) untouched.
 * Existing rows get product_id = NULL (no data impact).
 */
export class AddProductIdToOrganizationProductListings20260225100001
  implements MigrationInterface
{
  name = 'AddProductIdToOrganizationProductListings20260225100001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'organization_product_listings'
          AND column_name = 'product_id'
      );
    `);

    if (!columnExists[0]?.exists) {
      // 1. Add nullable product_id column
      await queryRunner.query(`
        ALTER TABLE "organization_product_listings"
          ADD COLUMN "product_id" UUID NULL;
      `);

      // 2. Add FK → neture_supplier_products (SET NULL on delete to preserve listings)
      await queryRunner.query(`
        ALTER TABLE "organization_product_listings"
          ADD CONSTRAINT "FK_org_product_listing_product"
          FOREIGN KEY ("product_id")
          REFERENCES "neture_supplier_products"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      `);

      // 3. Index for FK lookups
      await queryRunner.query(`
        CREATE INDEX "IDX_org_product_listing_product_id"
          ON "organization_product_listings" ("product_id");
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_org_product_listing_product_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_product_listings" DROP CONSTRAINT IF EXISTS "FK_org_product_listing_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_product_listings" DROP COLUMN IF EXISTS "product_id"`,
    );
  }
}
