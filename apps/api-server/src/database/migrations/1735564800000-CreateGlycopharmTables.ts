import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create Glycopharm Tables Migration
 *
 * Phase B-2: Glycopharm DB Schema Implementation
 * Creates glycopharm_pharmacies, glycopharm_products, glycopharm_product_logs tables
 */
export class CreateGlycopharmTables1735564800000 implements MigrationInterface {
  name = 'CreateGlycopharmTables1735564800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // Create glycopharm_pharmacies table
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glycopharm_pharmacies" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "code" varchar(100) NOT NULL UNIQUE,
        "address" text,
        "phone" varchar(50),
        "email" varchar(255),
        "owner_name" varchar(100),
        "business_number" varchar(50),
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "sort_order" int NOT NULL DEFAULT 0,
        "created_by_user_id" uuid,
        "created_by_user_name" varchar(100),
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for pharmacies
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_pharmacies_status" ON "glycopharm_pharmacies" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_pharmacies_code" ON "glycopharm_pharmacies" ("code")
    `);

    // ============================================================================
    // Create glycopharm_products table
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glycopharm_products" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "pharmacy_id" uuid,
        "name" varchar(255) NOT NULL,
        "sku" varchar(100) NOT NULL UNIQUE,
        "category" varchar(50) NOT NULL DEFAULT 'other',
        "description" text,
        "price" decimal(12, 2) NOT NULL DEFAULT 0,
        "sale_price" decimal(12, 2),
        "stock_quantity" int NOT NULL DEFAULT 0,
        "manufacturer" varchar(100),
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "is_featured" boolean NOT NULL DEFAULT false,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_by_user_id" uuid,
        "created_by_user_name" varchar(100),
        "updated_by_user_id" uuid,
        "updated_by_user_name" varchar(100),
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_glycopharm_products_pharmacy" FOREIGN KEY ("pharmacy_id")
          REFERENCES "glycopharm_pharmacies" ("id") ON DELETE SET NULL
      )
    `);

    // Indexes for products
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_products_pharmacy_id" ON "glycopharm_products" ("pharmacy_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_products_status" ON "glycopharm_products" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_products_category" ON "glycopharm_products" ("category")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_products_sku" ON "glycopharm_products" ("sku")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_products_is_featured" ON "glycopharm_products" ("is_featured")
    `);

    // ============================================================================
    // Create glycopharm_product_logs table
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glycopharm_product_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "action" varchar(50) NOT NULL,
        "before_data" jsonb,
        "after_data" jsonb,
        "reason" text,
        "changed_by_user_id" uuid,
        "changed_by_user_name" varchar(100),
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_glycopharm_product_logs_product" FOREIGN KEY ("product_id")
          REFERENCES "glycopharm_products" ("id") ON DELETE CASCADE
      )
    `);

    // Index for product logs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_product_logs_product_id" ON "glycopharm_product_logs" ("product_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_product_logs_created_at" ON "glycopharm_product_logs" ("created_at")
    `);

    console.log('[Migration] Glycopharm tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "glycopharm_product_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "glycopharm_products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "glycopharm_pharmacies"`);

    console.log('[Migration] Glycopharm tables dropped');
  }
}
