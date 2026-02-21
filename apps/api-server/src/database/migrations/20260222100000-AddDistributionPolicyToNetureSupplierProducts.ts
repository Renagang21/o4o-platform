import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-PRODUCT-DISTRIBUTION-POLICY-V1
 *
 * Add distribution_type (PUBLIC/PRIVATE) and allowed_seller_ids to neture_supplier_products.
 * - PUBLIC: visible in HUB (operator supply pool)
 * - PRIVATE: visible only to designated sellers
 * - Default: PUBLIC (all existing products remain visible)
 */
export class AddDistributionPolicyToNetureSupplierProducts1740200000000
  implements MigrationInterface
{
  name = 'AddDistributionPolicyToNetureSupplierProducts1740200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create enum type (idempotent)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'neture_supplier_products_distribution_type_enum') THEN
          CREATE TYPE neture_supplier_products_distribution_type_enum AS ENUM ('PUBLIC', 'PRIVATE');
        END IF;
      END $$;
    `);

    // Step 2: Add columns
    await queryRunner.query(`
      ALTER TABLE neture_supplier_products
        ADD COLUMN IF NOT EXISTS distribution_type neture_supplier_products_distribution_type_enum NOT NULL DEFAULT 'PUBLIC';
    `);

    await queryRunner.query(`
      ALTER TABLE neture_supplier_products
        ADD COLUMN IF NOT EXISTS allowed_seller_ids text[];
    `);

    // Step 3: Partial index for PRIVATE product lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_nsp_distribution_private"
        ON neture_supplier_products (distribution_type)
        WHERE distribution_type = 'PRIVATE';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_nsp_distribution_private"`);
    await queryRunner.query(`ALTER TABLE neture_supplier_products DROP COLUMN IF EXISTS allowed_seller_ids`);
    await queryRunner.query(`ALTER TABLE neture_supplier_products DROP COLUMN IF EXISTS distribution_type`);
  }
}
