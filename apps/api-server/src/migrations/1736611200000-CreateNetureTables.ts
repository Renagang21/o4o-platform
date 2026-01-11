import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Neture P1 Migration - Create Neture Tables
 *
 * Work Order: WO-NETURE-CORE-P1
 * Phase: P1 (Backend Integration)
 *
 * Creates 4 tables for Neture platform:
 * - neture_suppliers: Verified supplier information
 * - neture_supplier_products: Products offered by suppliers
 * - neture_partnership_requests: Partnership opportunities from sellers
 * - neture_partnership_products: Products included in partnership requests
 *
 * HARD RULES:
 * - All tables use neture_ prefix
 * - NO FK to Core tables (soft references only)
 * - Read-only platform design (GET only APIs)
 */
export class CreateNetureTables1736611200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 1. Create neture_suppliers table
    await queryRunner.query(`
      CREATE TABLE "neture_suppliers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "slug" VARCHAR(255) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "logo_url" TEXT,
        "category" VARCHAR(100),
        "short_description" TEXT,
        "description" TEXT,
        "pricing_policy" TEXT,
        "moq" VARCHAR(100),
        "shipping_standard" TEXT,
        "shipping_island" TEXT,
        "shipping_mountain" TEXT,
        "contact_email" VARCHAR(255),
        "contact_phone" VARCHAR(50),
        "contact_website" TEXT,
        "contact_kakao" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE'))
      )
    `);

    // Create indexes for neture_suppliers
    await queryRunner.query(`
      CREATE INDEX "idx_neture_suppliers_slug" ON "neture_suppliers" ("slug")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_neture_suppliers_status" ON "neture_suppliers" ("status")
    `);

    // 2. Create neture_supplier_products table
    await queryRunner.query(`
      CREATE TABLE "neture_supplier_products" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "supplier_id" uuid NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "category" VARCHAR(100),
        "description" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_neture_supplier_products_supplier"
          FOREIGN KEY ("supplier_id")
          REFERENCES "neture_suppliers" ("id")
          ON DELETE CASCADE
      )
    `);

    // Create index for neture_supplier_products
    await queryRunner.query(`
      CREATE INDEX "idx_neture_supplier_products_supplier" ON "neture_supplier_products" ("supplier_id")
    `);

    // 3. Create neture_partnership_requests table
    await queryRunner.query(`
      CREATE TABLE "neture_partnership_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "seller_id" VARCHAR(255) NOT NULL,
        "seller_name" VARCHAR(255) NOT NULL,
        "seller_service_type" VARCHAR(100),
        "seller_store_url" TEXT,
        "product_count" INT NOT NULL DEFAULT 0,
        "period_start" DATE,
        "period_end" DATE,
        "revenue_structure" TEXT,
        "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN', 'MATCHED', 'CLOSED')),
        "promotion_sns" BOOLEAN NOT NULL DEFAULT false,
        "promotion_content" BOOLEAN NOT NULL DEFAULT false,
        "promotion_banner" BOOLEAN NOT NULL DEFAULT false,
        "promotion_other" TEXT,
        "contact_email" VARCHAR(255),
        "contact_phone" VARCHAR(50),
        "contact_kakao" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "matched_at" TIMESTAMP,
        "metadata" JSONB
      )
    `);

    // Create indexes for neture_partnership_requests
    await queryRunner.query(`
      CREATE INDEX "idx_neture_partnership_status" ON "neture_partnership_requests" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_neture_partnership_seller" ON "neture_partnership_requests" ("seller_id")
    `);

    // 4. Create neture_partnership_products table
    await queryRunner.query(`
      CREATE TABLE "neture_partnership_products" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "partnership_request_id" uuid NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "category" VARCHAR(100),
        CONSTRAINT "fk_neture_partnership_products_request"
          FOREIGN KEY ("partnership_request_id")
          REFERENCES "neture_partnership_requests" ("id")
          ON DELETE CASCADE
      )
    `);

    // Create index for neture_partnership_products
    await queryRunner.query(`
      CREATE INDEX "idx_neture_partnership_products_request" ON "neture_partnership_products" ("partnership_request_id")
    `);

    console.log('✅ Neture tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting FK constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS "neture_partnership_products" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "neture_partnership_requests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "neture_supplier_products" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "neture_suppliers" CASCADE`);

    console.log('✅ Neture tables dropped successfully');
  }
}
