import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * R-8-6: Drop Order.items JSONB Column
 *
 * This migration removes the legacy `items` JSONB column from the `orders` table.
 *
 * Prerequisites (must be completed before running this migration):
 * - R-8-3-1: OrderItem entity introduced with dual-write
 * - R-8-3-2: Dashboard services migrated to OrderItem-based queries
 * - R-8-3-3: Customer services migrated to OrderItem-based queries
 * - R-8-4: Presentation fields added to OrderItem and backfilled
 * - R-8-5: Data consistency verified between JSONB and OrderItem
 *
 * Safety:
 * - This migration is IRREVERSIBLE in terms of data
 * - Once run, JSONB data is lost forever
 * - Ensure all data is properly migrated to OrderItem table before running
 * - down() method can restore the column structure, but NOT the data
 *
 * Verification before running:
 * 1. Check OrderItem count matches Order count
 * 2. Verify all services use itemsRelation, not items
 * 3. Run consistency check script
 * 4. Test all order-related APIs
 */
export class DropOrderItemsJsonbColumn7200000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the legacy items JSONB column
    await queryRunner.dropColumn('orders', 'items');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the items column structure (but data will be lost!)
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'items',
        type: 'jsonb',
        isNullable: false,
        comment: 'Legacy JSONB storage - RESTORED STRUCTURE ONLY, DATA IS LOST'
      })
    );
  }
}
