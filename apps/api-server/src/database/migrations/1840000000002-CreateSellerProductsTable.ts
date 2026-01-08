import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase PD-3: Create seller_products table
 *
 * Enables Seller workflow for importing supplier products into their catalog
 * with custom pricing, margins, and sync policies.
 */
export class CreateSellerProductsTable1840000000002 implements MigrationInterface {
    name = 'CreateSellerProductsTable1840000000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // This table requires products table to exist (FK constraint)
        const hasProductsTable = await queryRunner.hasTable('products');
        if (!hasProductsTable) {
            console.log('Skipping CreateSellerProductsTable: products table does not exist');
            return;
        }

        // Create seller_products table
        await queryRunner.query(`
            CREATE TABLE "seller_products" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sellerId" uuid NOT NULL,
                "productId" uuid NOT NULL,
                "salePrice" decimal(10,2),
                "basePriceSnapshot" decimal(10,2),
                "marginRate" decimal(5,4),
                "marginAmount" decimal(10,2),
                "syncPolicy" varchar(20) NOT NULL DEFAULT 'auto',
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_seller_products_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_seller_products_sellerId_productId" UNIQUE ("sellerId", "productId"),
                CONSTRAINT "FK_seller_products_sellerId" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_seller_products_productId" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
                CONSTRAINT "CHK_seller_products_syncPolicy" CHECK ("syncPolicy" IN ('auto', 'manual'))
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_seller_products_sellerId_isActive"
            ON "seller_products" ("sellerId", "isActive")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_seller_products_sellerId_createdAt"
            ON "seller_products" ("sellerId", "createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_seller_products_productId"
            ON "seller_products" ("productId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_seller_products_syncPolicy"
            ON "seller_products" ("syncPolicy") WHERE "syncPolicy" = 'auto'
        `);

        // Add comments
        await queryRunner.query(`
            COMMENT ON TABLE "seller_products" IS 'Phase PD-3: Products imported by sellers with custom pricing and margins'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "seller_products"."salePrice" IS 'Seller''s selling price (final price to customer)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "seller_products"."basePriceSnapshot" IS 'Snapshot of supplier price at import time'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "seller_products"."marginRate" IS 'Margin rate (0-1, e.g., 0.25 = 25%)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "seller_products"."marginAmount" IS 'Margin amount in currency (salePrice - basePrice)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "seller_products"."syncPolicy" IS 'auto: Auto-sync with supplier price changes, manual: Seller manages price manually'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable('seller_products');
        if (!hasTable) {
            return;
        }

        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_seller_products_syncPolicy"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_seller_products_productId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_seller_products_sellerId_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_seller_products_sellerId_isActive"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "seller_products" DROP CONSTRAINT "FK_seller_products_productId"`);
        await queryRunner.query(`ALTER TABLE "seller_products" DROP CONSTRAINT "FK_seller_products_sellerId"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "seller_products"`);
    }
}
