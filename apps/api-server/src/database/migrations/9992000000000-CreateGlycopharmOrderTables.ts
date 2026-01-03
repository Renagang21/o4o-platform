import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create Glycopharm Order Tables Migration
 *
 * H8-2: glycopharm 주문/결제 API v1 Implementation
 * Creates glycopharm_orders and glycopharm_order_items tables
 */
export class CreateGlycopharmOrderTables9992000000000 implements MigrationInterface {
  name = 'CreateGlycopharmOrderTables9992000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // Create glycopharm_orders table
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glycopharm_orders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "pharmacy_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'CREATED',
        "total_amount" decimal(12, 2) NOT NULL DEFAULT 0,
        "customer_name" varchar(255),
        "customer_phone" varchar(50),
        "shipping_address" text,
        "note" text,
        "paid_at" timestamp,
        "payment_method" varchar(255),
        "payment_id" varchar(255),
        "failure_reason" text,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_glycopharm_orders_pharmacy" FOREIGN KEY ("pharmacy_id")
          REFERENCES "glycopharm_pharmacies" ("id") ON DELETE RESTRICT
      )
    `);

    // Indexes for orders
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_orders_pharmacy_id" ON "glycopharm_orders" ("pharmacy_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_orders_user_id" ON "glycopharm_orders" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_orders_status" ON "glycopharm_orders" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_orders_created_at" ON "glycopharm_orders" ("created_at")
    `);

    // ============================================================================
    // Create glycopharm_order_items table
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glycopharm_order_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "product_name" varchar(255) NOT NULL,
        "product_sku" varchar(100),
        "quantity" int NOT NULL DEFAULT 1,
        "unit_price" decimal(12, 2) NOT NULL,
        "subtotal" decimal(12, 2) NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_glycopharm_order_items_order" FOREIGN KEY ("order_id")
          REFERENCES "glycopharm_orders" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_glycopharm_order_items_product" FOREIGN KEY ("product_id")
          REFERENCES "glycopharm_products" ("id") ON DELETE RESTRICT
      )
    `);

    // Indexes for order items
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_order_items_order_id" ON "glycopharm_order_items" ("order_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_order_items_product_id" ON "glycopharm_order_items" ("product_id")
    `);

    console.log('[Migration] Glycopharm order tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "glycopharm_order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "glycopharm_orders"`);

    console.log('[Migration] Glycopharm order tables dropped');
  }
}
