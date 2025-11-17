import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddOrderEventsAndShippingCarrier1800000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add shippingCarrier column to orders table
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'shippingCarrier',
        type: 'varchar',
        isNullable: true
      })
    );

    // Create order_events table
    await queryRunner.createTable(
      new Table({
        name: 'order_events',
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
          {
            name: 'type',
            type: 'enum',
            enum: ['order_created', 'status_change', 'shipping_update', 'payment_update', 'note_added', 'cancellation', 'refund'],
            isNullable: false
          },
          {
            name: 'prevStatus',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'newStatus',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'message',
            type: 'text',
            isNullable: true
          },
          {
            name: 'actorId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'actorName',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'actorRole',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'source',
            type: 'enum',
            enum: ['web', 'mobile', 'api', 'admin', 'system'],
            default: "'system'",
            isNullable: false
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ]
      }),
      true
    );

    // Create foreign key for orderId
    await queryRunner.createForeignKey(
      'order_events',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    );

    // Create foreign key for actorId
    await queryRunner.createForeignKey(
      'order_events',
      new TableForeignKey({
        columnNames: ['actorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL'
      })
    );

    // Create indexes
    await queryRunner.createIndex(
      'order_events',
      new TableIndex({
        name: 'IDX_ORDER_EVENTS_ORDER_ID',
        columnNames: ['orderId']
      })
    );

    await queryRunner.createIndex(
      'order_events',
      new TableIndex({
        name: 'IDX_ORDER_EVENTS_CREATED_AT',
        columnNames: ['createdAt']
      })
    );

    await queryRunner.createIndex(
      'order_events',
      new TableIndex({
        name: 'IDX_ORDER_EVENTS_TYPE',
        columnNames: ['type']
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('order_events', 'IDX_ORDER_EVENTS_TYPE');
    await queryRunner.dropIndex('order_events', 'IDX_ORDER_EVENTS_CREATED_AT');
    await queryRunner.dropIndex('order_events', 'IDX_ORDER_EVENTS_ORDER_ID');

    // Drop foreign keys
    const table = await queryRunner.getTable('order_events');
    if (table) {
      const actorForeignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('actorId') !== -1);
      const orderForeignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('orderId') !== -1);

      if (actorForeignKey) {
        await queryRunner.dropForeignKey('order_events', actorForeignKey);
      }
      if (orderForeignKey) {
        await queryRunner.dropForeignKey('order_events', orderForeignKey);
      }
    }

    // Drop order_events table
    await queryRunner.dropTable('order_events');

    // Remove shippingCarrier column from orders table
    await queryRunner.dropColumn('orders', 'shippingCarrier');
  }
}
