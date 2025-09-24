import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateShippingTracking1706123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'shipping_trackings',
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
            type: 'uuid'
          },
          {
            name: 'carrier',
            type: 'enum',
            enum: [
              'cj_logistics',
              'korea_post',
              'hanjin',
              'lotte',
              'logen',
              'dhl',
              'fedex',
              'ups',
              'other'
            ],
            default: "'cj_logistics'"
          },
          {
            name: 'trackingNumber',
            type: 'varchar'
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'pending',
              'picked_up',
              'in_transit',
              'out_for_delivery',
              'delivered',
              'failed',
              'returned',
              'cancelled'
            ],
            default: "'pending'"
          },
          {
            name: 'estimatedDeliveryDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'actualDeliveryDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'recipientName',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'recipientSignature',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'deliveryNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'trackingHistory',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'shippingAddress',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'shippingCost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 8,
            scale: 2,
            isNullable: true
          },
          {
            name: 'dimensions',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'returnTrackingNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'failureReason',
            type: 'text',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['orderId'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ],
        indices: [
          {
            name: 'IDX_shipping_tracking_order',
            columnNames: ['orderId']
          },
          {
            name: 'IDX_shipping_tracking_number',
            columnNames: ['trackingNumber']
          },
          {
            name: 'IDX_shipping_tracking_carrier',
            columnNames: ['carrier']
          },
          {
            name: 'IDX_shipping_tracking_status',
            columnNames: ['status']
          },
          {
            name: 'IDX_shipping_tracking_created',
            columnNames: ['createdAt']
          }
        ]
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('shipping_trackings');
  }
}