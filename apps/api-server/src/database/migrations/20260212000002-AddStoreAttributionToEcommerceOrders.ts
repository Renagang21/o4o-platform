/**
 * Migration: Add Store Attribution Columns to EcommerceOrders
 *
 * WO-KCOS-STORES-PHASE2-ORDER-ATTRIBUTION-V1
 *
 * Adds first-class columns for store attribution:
 * - store_id: UUID reference to the originating store
 * - order_source: How the order was placed (online, in-store, kiosk)
 * - channel: Business channel (local, travel)
 *
 * These fields were previously stored only in metadata JSONB.
 * Promoting them to indexed columns enables efficient KPI aggregation.
 */

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddStoreAttributionToEcommerceOrders20260212000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add store_id column (nullable - existing orders don't have one)
    await queryRunner.query(`
      ALTER TABLE ecommerce_orders
      ADD COLUMN IF NOT EXISTS store_id UUID
    `);

    // Add order_source column
    await queryRunner.query(`
      ALTER TABLE ecommerce_orders
      ADD COLUMN IF NOT EXISTS order_source VARCHAR(50)
    `);

    // Add channel column
    await queryRunner.query(`
      ALTER TABLE ecommerce_orders
      ADD COLUMN IF NOT EXISTS channel VARCHAR(50)
    `);

    // Create indexes for KPI aggregation queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_eo_store_id ON ecommerce_orders (store_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_eo_channel ON ecommerce_orders (channel)
    `);

    // Composite index for store + status queries (dashboard summary)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_eo_store_status ON ecommerce_orders (store_id, status)
    `);

    // Composite index for store + created_at queries (time-based KPI)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_eo_store_created ON ecommerce_orders (store_id, "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_eo_store_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_eo_store_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_eo_channel`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_eo_store_id`);
    await queryRunner.query(`ALTER TABLE ecommerce_orders DROP COLUMN IF EXISTS channel`);
    await queryRunner.query(`ALTER TABLE ecommerce_orders DROP COLUMN IF EXISTS order_source`);
    await queryRunner.query(`ALTER TABLE ecommerce_orders DROP COLUMN IF EXISTS store_id`);
  }
}
