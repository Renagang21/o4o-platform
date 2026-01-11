import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5-A′: Add orderType column to checkout_orders
 *
 * This migration adds the orderType enum column to identify
 * which service created each order.
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @see WO-O4O-STRUCTURE-REFORM-PHASE5-A′-V01
 */
export class AddOrderTypeToCheckoutOrders1736950000000
  implements MigrationInterface
{
  name = 'AddOrderTypeToCheckoutOrders1736950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the OrderType enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checkout_orders_order_type_enum') THEN
          CREATE TYPE "checkout_orders_order_type_enum" AS ENUM (
            'GENERIC',
            'DROPSHIPPING',
            'GLYCOPHARM',
            'COSMETICS',
            'TOURISM'
          );
        END IF;
      END
      $$;
    `);

    // Add orderType column with default value GENERIC
    await queryRunner.query(`
      ALTER TABLE "checkout_orders"
      ADD COLUMN IF NOT EXISTS "order_type" "checkout_orders_order_type_enum"
      NOT NULL DEFAULT 'GENERIC'
    `);

    // Create index on orderType for filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_checkout_orders_order_type"
      ON "checkout_orders" ("order_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_checkout_orders_order_type"
    `);

    // Drop the column
    await queryRunner.query(`
      ALTER TABLE "checkout_orders"
      DROP COLUMN IF EXISTS "order_type"
    `);

    // Note: We don't drop the enum type as it might be used elsewhere
    // or cause issues if other migrations depend on it
  }
}
