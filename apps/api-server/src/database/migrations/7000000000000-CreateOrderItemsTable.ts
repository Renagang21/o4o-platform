/**
 * R-8-3-1: OrderItem Normalization Migration
 *
 * Creates order_items table to replace JSONB-based storage with relational entity
 *
 * Strategy:
 * - Creates new order_items table with proper indexes
 * - Does NOT backfill existing data (separate backfill script)
 * - Maintains backward compatibility (Order.items JSONB remains)
 * - Enables efficient dashboard queries via JOINs
 *
 * Phase 3-1: Table creation only
 * Phase 3-2: Backfill script (separate)
 * Phase 3-3: Dashboard service migration (gradual)
 */

import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOrderItemsTable7000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create order_items table
    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'orderId',
            type: 'uuid',
            isNullable: false
          },
          // Product Information (snapshot at order creation time)
          {
            name: 'productId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'productName',
            type: 'varchar',
            length: '500',
            isNullable: false
          },
          {
            name: 'productSku',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'quantity',
            type: 'int',
            isNullable: false
          },
          {
            name: 'unitPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false
          },
          {
            name: 'totalPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false
          },
          // Supplier Information
          {
            name: 'supplierId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'supplierName',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          // Seller Information
          {
            name: 'sellerId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'sellerName',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          // Seller Product Reference (Phase PD-3/PD-4)
          {
            name: 'sellerProductId',
            type: 'uuid',
            isNullable: true
          },
          // Pricing Snapshots (Immutable)
          {
            name: 'basePriceSnapshot',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'salePriceSnapshot',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'marginAmountSnapshot',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          // Commission Information (Immutable, fixed at order creation)
          {
            name: 'commissionType',
            type: 'varchar',
            length: '10',
            isNullable: true
          },
          {
            name: 'commissionRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'commissionAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          // Flexible Metadata
          {
            name: 'attributes',
            type: 'jsonb',
            isNullable: true
          },
          // Optional Notes
          {
            name: 'notes',
            type: 'text',
            isNullable: true
          },
          // Audit Timestamps
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ]
      }),
      true
    );

    // Create foreign key to orders table (CASCADE delete)
    await queryRunner.createForeignKey('order_items', {
      columnNames: ['orderId'],
      referencedTableName: 'orders',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      name: 'FK_order_items_orderId'
    } as any);

    // Create individual indexes for common filters
    // These enable efficient dashboard queries

    // Primary lookup: Find items by order
    await queryRunner.createIndex('order_items', {
      name: 'IDX_order_items_orderId',
      columnNames: ['orderId']
    } as any);

    // SellerDashboardService queries: Filter by seller
    await queryRunner.createIndex('order_items', {
      name: 'IDX_order_items_sellerId',
      columnNames: ['sellerId']
    } as any);

    // SupplierDashboardService queries: Filter by supplier
    await queryRunner.createIndex('order_items', {
      name: 'IDX_order_items_supplierId',
      columnNames: ['supplierId']
    } as any);

    // Seller product performance tracking
    await queryRunner.createIndex('order_items', {
      name: 'IDX_order_items_sellerProductId',
      columnNames: ['sellerProductId']
    } as any);

    // Product performance analytics
    await queryRunner.createIndex('order_items', {
      name: 'IDX_order_items_productId',
      columnNames: ['productId']
    } as any);

    // Composite indexes for common query patterns
    // These optimize dashboard aggregations (SUM, COUNT, AVG)

    // Seller dashboard: seller items with their orders
    await queryRunner.createIndex('order_items', {
      name: 'IDX_order_items_seller_order',
      columnNames: ['sellerId', 'orderId']
    } as any);

    // Supplier dashboard: supplier items with their orders
    await queryRunner.createIndex('order_items', {
      name: 'IDX_order_items_supplier_order',
      columnNames: ['supplierId', 'orderId']
    } as any);

    // Commission calculations: seller + commission fields
    await queryRunner.createIndex('order_items', {
      name: 'IDX_order_items_seller_commission',
      columnNames: ['sellerId', 'commissionAmount']
    } as any);

    // GIN index for JSONB attributes (flexible metadata search)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_order_items_attributes_gin
      ON order_items USING GIN (attributes);
    `);

    console.log('✅ OrderItems table created successfully');
    console.log('📊 Indexes created: orderId, sellerId, supplierId, sellerProductId, productId');
    console.log('🔗 Foreign key: orderId -> orders.id (CASCADE)');
    console.log('⚠️  Note: Existing order data NOT backfilled (run backfill script separately)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first (including GIN index)
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_order_items_attributes_gin;`);

    await queryRunner.dropIndex('order_items', 'IDX_order_items_seller_commission');
    await queryRunner.dropIndex('order_items', 'IDX_order_items_supplier_order');
    await queryRunner.dropIndex('order_items', 'IDX_order_items_seller_order');
    await queryRunner.dropIndex('order_items', 'IDX_order_items_productId');
    await queryRunner.dropIndex('order_items', 'IDX_order_items_sellerProductId');
    await queryRunner.dropIndex('order_items', 'IDX_order_items_supplierId');
    await queryRunner.dropIndex('order_items', 'IDX_order_items_sellerId');
    await queryRunner.dropIndex('order_items', 'IDX_order_items_orderId');

    // Drop foreign key
    const table = await queryRunner.getTable('order_items');
    if (table) {
      const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('orderId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('order_items', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('order_items');

    console.log('✅ OrderItems table dropped');
  }
}
