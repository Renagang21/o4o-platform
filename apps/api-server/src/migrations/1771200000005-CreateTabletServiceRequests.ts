import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Create Tablet Service Requests Table
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 *
 * Creates:
 * - tablet_service_requests: Lightweight request queue for in-store tablet ordering
 *   (NOT an orders/payments table — service request queue only)
 */
export class CreateTabletServiceRequests1771200000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tablet_service_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'pharmacy_id',
            type: 'uuid',
            comment: 'Target pharmacy (glycopharm_pharmacies.id)',
          },
          {
            name: 'items',
            type: 'jsonb',
            comment: 'Array of {productId, quantity, productName, price}',
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'customer_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'requested'",
            comment: 'requested | acknowledged | served | cancelled',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'acknowledged_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'served_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'cancelled_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tablet_service_requests',
      new TableIndex({
        name: 'idx_tablet_req_pharmacy_status',
        columnNames: ['pharmacy_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'tablet_service_requests',
      new TableIndex({
        name: 'idx_tablet_req_pharmacy_created',
        columnNames: ['pharmacy_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tablet_service_requests');
  }
}
