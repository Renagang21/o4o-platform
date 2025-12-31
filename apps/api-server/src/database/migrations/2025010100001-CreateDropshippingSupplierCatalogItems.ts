import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DS-2 Migration: Create dropshipping_supplier_catalog_items table
 *
 * This table stores supplier-registered catalog items owned by the Dropshipping domain.
 * Complies with DS-1 rules:
 * - dropshipping_ prefix required
 * - No FK constraints to Core tables (users, organizations)
 * - External IDs stored as UUID strings (soft FK)
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */
export class CreateDropshippingSupplierCatalogItems2025010100001 implements MigrationInterface {
    name = 'CreateDropshippingSupplierCatalogItems2025010100001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create dropshipping_supplier_catalog_items table
        await queryRunner.query(`
            CREATE TABLE "dropshipping_supplier_catalog_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "supplier_id" varchar(36) NOT NULL,
                "external_product_ref" varchar(255),
                "name" varchar(255) NOT NULL,
                "description" text,
                "short_description" varchar(500),
                "sku" varchar(100),
                "barcode" varchar(100),
                "base_price" decimal(12,2) NOT NULL,
                "currency" varchar(3) NOT NULL DEFAULT 'KRW',
                "weight" decimal(8,2),
                "dimensions" jsonb,
                "category" varchar(100),
                "tags" text[],
                "images" jsonb,
                "thumbnail_image" varchar(500),
                "specifications" jsonb,
                "status" varchar(20) NOT NULL DEFAULT 'draft',
                "is_active" boolean NOT NULL DEFAULT true,
                "minimum_order_quantity" integer NOT NULL DEFAULT 1,
                "maximum_order_quantity" integer,
                "lead_time_days" integer NOT NULL DEFAULT 7,
                "inventory_count" integer NOT NULL DEFAULT 0,
                "low_stock_threshold" integer DEFAULT 10,
                "metadata" jsonb,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now(),
                "deleted_at" timestamp,
                CONSTRAINT "PK_dropshipping_supplier_catalog_items" PRIMARY KEY ("id"),
                CONSTRAINT "CHK_dropshipping_supplier_catalog_items_status" CHECK (
                    "status" IN ('draft', 'pending', 'approved', 'rejected', 'retired')
                )
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_supplier_catalog_items_supplier_id"
            ON "dropshipping_supplier_catalog_items" ("supplier_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_supplier_catalog_items_status"
            ON "dropshipping_supplier_catalog_items" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_supplier_catalog_items_status_active"
            ON "dropshipping_supplier_catalog_items" ("status", "is_active")
            WHERE "deleted_at" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_supplier_catalog_items_category"
            ON "dropshipping_supplier_catalog_items" ("category")
            WHERE "deleted_at" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_supplier_catalog_items_sku"
            ON "dropshipping_supplier_catalog_items" ("sku")
            WHERE "sku" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_supplier_catalog_items_sku"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_supplier_catalog_items_category"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_supplier_catalog_items_status_active"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_supplier_catalog_items_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_supplier_catalog_items_supplier_id"`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "dropshipping_supplier_catalog_items"`);
    }
}
