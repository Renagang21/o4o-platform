/**
 * WO-PRODUCT-POLICY-V2-LISTING-EXTERNAL-ID-REMOVAL-V1
 *
 * 1. DROP old UNIQUE constraint (organization_id, service_key, external_product_id)
 * 2. DROP column external_product_id
 * 3. SET product_id NOT NULL
 * 4. ADD new UNIQUE constraint (organization_id, service_key, product_id)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveExternalProductIdFromListings1740556801000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Safety: try to backfill product_id from external_product_id (UUID format)
    //    If external_product_id is a valid UUID, use it as product_id
    const hasExternalCol = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organization_product_listings'
          AND column_name = 'external_product_id'
      ) AS exists
    `);

    if (hasExternalCol[0]?.exists) {
      await queryRunner.query(`
        UPDATE organization_product_listings
        SET product_id = external_product_id::uuid
        WHERE product_id IS NULL
          AND external_product_id IS NOT NULL
          AND external_product_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      `);
    }

    // 0b. Remove orphaned listings that still have NULL product_id
    //     (legacy rows with no valid product reference)
    await queryRunner.query(`
      DELETE FROM organization_product_listings
      WHERE product_id IS NULL
    `);

    // 1. Drop old unique constraint
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
      DROP CONSTRAINT IF EXISTS "UQ_org_product_listing_unique"
    `);

    // 2. Drop external_product_id column
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
      DROP COLUMN IF EXISTS "external_product_id"
    `);

    // 3. Set product_id NOT NULL (orphaned rows already removed above)
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
      ALTER COLUMN "product_id" SET NOT NULL
    `);

    // 4. Add new unique constraint
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
      ADD CONSTRAINT "UQ_opl_org_service_product"
      UNIQUE ("organization_id", "service_key", "product_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: drop new constraint, add column back, restore old constraint
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
      DROP CONSTRAINT IF EXISTS "UQ_opl_org_service_product"
    `);

    await queryRunner.query(`
      ALTER TABLE organization_product_listings
      ALTER COLUMN "product_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE organization_product_listings
      ADD COLUMN IF NOT EXISTS "external_product_id" VARCHAR(200)
    `);

    // Backfill external_product_id from product_id for existing rows
    await queryRunner.query(`
      UPDATE organization_product_listings
      SET "external_product_id" = "product_id"::text
      WHERE "external_product_id" IS NULL AND "product_id" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE organization_product_listings
      ALTER COLUMN "external_product_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE organization_product_listings
      ADD CONSTRAINT "UQ_org_product_listing_unique"
      UNIQUE ("organization_id", "service_key", "external_product_id")
    `);
  }
}
