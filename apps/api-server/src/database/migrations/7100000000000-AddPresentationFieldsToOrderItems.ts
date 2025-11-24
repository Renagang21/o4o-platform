/**
 * R-8-4: Add Presentation Fields to OrderItems
 *
 * Adds frontend display fields to order_items table:
 * - product_image: Product thumbnail URL
 * - product_brand: Brand name
 * - variation_name: Product variation/option name
 *
 * These fields were previously only stored in JSONB Order.items
 * This migration prepares for JSONB removal (R-8-6) by normalizing these fields
 *
 * Migration Strategy:
 * - Schema-only change (no data backfill in this migration)
 * - All columns nullable to allow gradual backfill
 * - No indexes (these are display-only fields, not query filters)
 * - Backfill handled by separate script: backfill-order-item-presentation-fields.ts
 */

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPresentationFieldsToOrderItems7100000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add product_image column
    await queryRunner.addColumn(
      'order_items',
      new TableColumn({
        name: 'product_image',
        type: 'varchar',
        isNullable: true,
        comment: 'Product thumbnail URL for frontend display'
      })
    );

    // Add product_brand column
    await queryRunner.addColumn(
      'order_items',
      new TableColumn({
        name: 'product_brand',
        type: 'varchar',
        isNullable: true,
        comment: 'Brand name for frontend display'
      })
    );

    // Add variation_name column
    await queryRunner.addColumn(
      'order_items',
      new TableColumn({
        name: 'variation_name',
        type: 'varchar',
        isNullable: true,
        comment: 'Product variation/option name (e.g., "Red, Large")'
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns in reverse order
    await queryRunner.dropColumn('order_items', 'variation_name');
    await queryRunner.dropColumn('order_items', 'product_brand');
    await queryRunner.dropColumn('order_items', 'product_image');
  }
}
