import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DS-2 Migration: Create dropshipping_seller_offers table
 *
 * This table stores seller offers created from supplier catalog items.
 * Complies with DS-1 rules:
 * - dropshipping_ prefix required
 * - No FK constraints to Core tables
 * - External IDs stored as UUID strings (soft FK)
 * - Status follows DS-1 state model: draft → pending → active → paused → retired
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */
export class CreateDropshippingSellerOffers2025010100002 implements MigrationInterface {
    name = 'CreateDropshippingSellerOffers2025010100002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create dropshipping_seller_offers table
        await queryRunner.query(`
            CREATE TABLE "dropshipping_seller_offers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "seller_id" varchar(36) NOT NULL,
                "supplier_catalog_item_id" varchar(36) NOT NULL,
                "ecommerce_order_id" varchar(36),
                "offer_name" varchar(255),
                "offer_description" text,
                "offer_price" decimal(12,2) NOT NULL,
                "compare_price" decimal(12,2),
                "cost_price" decimal(12,2) NOT NULL,
                "profit_amount" decimal(12,2) NOT NULL DEFAULT 0,
                "profit_margin" decimal(5,2) NOT NULL DEFAULT 0,
                "currency" varchar(3) NOT NULL DEFAULT 'KRW',
                "status" varchar(20) NOT NULL DEFAULT 'draft',
                "is_active" boolean NOT NULL DEFAULT true,
                "is_visible" boolean NOT NULL DEFAULT true,
                "seller_sku" varchar(255),
                "seller_tags" text[],
                "seller_images" jsonb,
                "discount_rate" decimal(5,2),
                "sale_start_date" timestamp,
                "sale_end_date" timestamp,
                "is_featured" boolean NOT NULL DEFAULT false,
                "featured_until" timestamp,
                "view_count" integer NOT NULL DEFAULT 0,
                "cart_add_count" integer NOT NULL DEFAULT 0,
                "total_sold" integer NOT NULL DEFAULT 0,
                "total_revenue" decimal(12,2) NOT NULL DEFAULT 0,
                "conversion_rate" decimal(5,2) NOT NULL DEFAULT 0,
                "average_rating" decimal(3,2) NOT NULL DEFAULT 0,
                "review_count" integer NOT NULL DEFAULT 0,
                "seo_title" varchar(255),
                "seo_description" text,
                "slug" varchar(255),
                "metadata" jsonb,
                "activated_at" timestamp,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now(),
                "deleted_at" timestamp,
                CONSTRAINT "PK_dropshipping_seller_offers" PRIMARY KEY ("id"),
                CONSTRAINT "CHK_dropshipping_seller_offers_status" CHECK (
                    "status" IN ('draft', 'pending', 'active', 'paused', 'retired')
                )
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_seller_offers_seller_id"
            ON "dropshipping_seller_offers" ("seller_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_seller_offers_catalog_item_id"
            ON "dropshipping_seller_offers" ("supplier_catalog_item_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_seller_offers_status"
            ON "dropshipping_seller_offers" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_seller_offers_status_active"
            ON "dropshipping_seller_offers" ("status", "is_active")
            WHERE "deleted_at" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_seller_offers_seller_status"
            ON "dropshipping_seller_offers" ("seller_id", "status")
            WHERE "deleted_at" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_seller_offers_price"
            ON "dropshipping_seller_offers" ("offer_price")
            WHERE "status" = 'active' AND "deleted_at" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_seller_offers_slug"
            ON "dropshipping_seller_offers" ("slug")
            WHERE "slug" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_dropshipping_seller_offers_seller_catalog"
            ON "dropshipping_seller_offers" ("seller_id", "supplier_catalog_item_id")
            WHERE "deleted_at" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_dropshipping_seller_offers_seller_catalog"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_seller_offers_slug"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_seller_offers_price"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_seller_offers_seller_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_seller_offers_status_active"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_seller_offers_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_seller_offers_catalog_item_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_seller_offers_seller_id"`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "dropshipping_seller_offers"`);
    }
}
