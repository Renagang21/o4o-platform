import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateOrderTables1790000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create orders table
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'orderNumber',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'buyerId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'buyerType',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'buyerName',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'buyerEmail',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'buyerGrade',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'items',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'summary',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'KRW'",
            isNullable: false
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
            default: "'pending'",
            isNullable: false
          },
          {
            name: 'paymentStatus',
            type: 'enum',
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: "'pending'",
            isNullable: false
          },
          {
            name: 'paymentMethod',
            type: 'enum',
            enum: ['card', 'transfer', 'virtual_account', 'kakao_pay', 'naver_pay', 'paypal', 'cash_on_delivery'],
            isNullable: true
          },
          {
            name: 'billingAddress',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'shippingAddress',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'shippingMethod',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'trackingNumber',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'trackingUrl',
            type: 'text',
            isNullable: true
          },
          {
            name: 'orderDate',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'paymentDate',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'confirmedDate',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'shippingDate',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'deliveryDate',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'cancelledDate',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'customerNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'adminNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'cancellationReason',
            type: 'text',
            isNullable: true
          },
          {
            name: 'returnReason',
            type: 'text',
            isNullable: true
          },
          {
            name: 'refundAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'refundDate',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'source',
            type: 'enum',
            enum: ['web', 'mobile', 'api', 'admin'],
            default: "'web'",
            isNullable: false
          },
          {
            name: 'partnerId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'partnerName',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'referralCode',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
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
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ]
      }),
      true
    );

    // Create indexes for better performance
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_buyerId',
      columnNames: ['buyerId']
    } as any);
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_status',
      columnNames: ['status']
    } as any);
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_paymentStatus',
      columnNames: ['paymentStatus']
    } as any);
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_orderDate',
      columnNames: ['orderDate']
    } as any);
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_orderNumber',
      columnNames: ['orderNumber'],
      isUnique: true
    } as any);
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_trackingNumber',
      columnNames: ['trackingNumber']
    } as any);
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_partnerId',
      columnNames: ['partnerId']
    } as any);
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_referralCode',
      columnNames: ['referralCode']
    } as any);

    // Create foreign key constraint to users table
    await queryRunner.createForeignKey('orders', {
      columnNames: ['buyerId'],
      referencedTableName: 'users',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    } as any);

    // Create GIN indexes for JSONB columns for better search performance
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_orders_items_gin 
      ON orders USING GIN (items);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_orders_summary_gin 
      ON orders USING GIN (summary);
    `);

    // Create indexes for JSON path queries (commonly used filters)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_orders_total_amount 
      ON orders USING BTREE ((CAST(summary->>'total' AS NUMERIC)));
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_orders_subtotal 
      ON orders USING BTREE ((CAST(summary->>'subtotal' AS NUMERIC)));
    `);

    // Create composite indexes for common query patterns
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_buyer_status',
      columnNames: ['buyerId', 'status']
    } as any);
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_buyer_orderDate',
      columnNames: ['buyerId', 'orderDate']
    } as any);
    await queryRunner.createIndex('orders', {
      name: 'IDX_orders_status_orderDate',
      columnNames: ['status', 'orderDate']
    } as any);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_orders_items_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_orders_summary_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_orders_total_amount;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_orders_subtotal;`);

    await queryRunner.dropIndex('orders', 'IDX_orders_buyer_status');
    await queryRunner.dropIndex('orders', 'IDX_orders_buyer_orderDate');
    await queryRunner.dropIndex('orders', 'IDX_orders_status_orderDate');
    await queryRunner.dropIndex('orders', 'IDX_orders_buyerId');
    await queryRunner.dropIndex('orders', 'IDX_orders_status');
    await queryRunner.dropIndex('orders', 'IDX_orders_paymentStatus');
    await queryRunner.dropIndex('orders', 'IDX_orders_orderDate');
    await queryRunner.dropIndex('orders', 'IDX_orders_orderNumber');
    await queryRunner.dropIndex('orders', 'IDX_orders_trackingNumber');
    await queryRunner.dropIndex('orders', 'IDX_orders_partnerId');
    await queryRunner.dropIndex('orders', 'IDX_orders_referralCode');

    // Drop foreign key
    const table = await queryRunner.getTable('orders');
    if (table) {
      const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('buyerId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('orders', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('orders');
  }
}