import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase PD-2: Add commission policy fields to Product and BusinessInfo tables
 *
 * This migration adds flexible commission structure supporting:
 * - Product-level commission policies (rate or fixed)
 * - Seller-level default commission rates
 * - Priority system: Product → Seller → Global Default (20%)
 */
export class AddCommissionPolicyFields1830000000002 implements MigrationInterface {
    name = 'AddCommissionPolicyFields1830000000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add commission policy fields to products table
        await queryRunner.query(`
            ALTER TABLE "products"
            ADD COLUMN "commissionType" character varying CHECK ("commissionType" IN ('rate', 'fixed')),
            ADD COLUMN "commissionValue" decimal(10,4),
            ADD COLUMN "sellerCommissionRate" decimal(5,2),
            ADD COLUMN "platformCommissionRate" decimal(5,2)
        `);

        // Add comment explaining the fields
        await queryRunner.query(`
            COMMENT ON COLUMN "products"."commissionType" IS 'Commission calculation type: rate (percentage) or fixed (amount per item). NULL = use seller/global default'
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "products"."commissionValue" IS 'Commission value: For rate: 0-1 (e.g., 0.20 = 20%), For fixed: amount in KRW. NULL = use seller/global default'
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "products"."sellerCommissionRate" IS 'Optional: Seller-specific commission rate override (0-100%)'
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "products"."platformCommissionRate" IS 'Optional: Platform commission rate for future use (0-100%)'
        `);

        // Add default commission rate to business_info table
        await queryRunner.query(`
            ALTER TABLE "business_info"
            ADD COLUMN "defaultCommissionRate" decimal(5,2)
        `);

        // Add comment explaining the field
        await queryRunner.query(`
            COMMENT ON COLUMN "business_info"."defaultCommissionRate" IS 'Seller/Partner default commission rate (0-100%). Used when Product has no commission policy. NULL = use global default (20%)'
        `);

        // Create indexes for commission fields
        await queryRunner.query(`
            CREATE INDEX "IDX_products_commissionType" ON "products" ("commissionType") WHERE "commissionType" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_business_info_defaultCommissionRate" ON "business_info" ("defaultCommissionRate") WHERE "defaultCommissionRate" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_business_info_defaultCommissionRate"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_commissionType"`);

        // Remove comments
        await queryRunner.query(`COMMENT ON COLUMN "business_info"."defaultCommissionRate" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "products"."platformCommissionRate" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "products"."sellerCommissionRate" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "products"."commissionValue" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "products"."commissionType" IS NULL`);

        // Remove columns from business_info
        await queryRunner.query(`ALTER TABLE "business_info" DROP COLUMN "defaultCommissionRate"`);

        // Remove columns from products
        await queryRunner.query(`
            ALTER TABLE "products"
            DROP COLUMN "platformCommissionRate",
            DROP COLUMN "sellerCommissionRate",
            DROP COLUMN "commissionValue",
            DROP COLUMN "commissionType"
        `);
    }
}
