import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Phase PD-5: Settlement System - Database Migration
 *
 * Creates settlements and settlement_items tables for dropshipping settlement management
 */
export class CreateSettlementTables1737115000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create SettlementStatus enum type
    await queryRunner.query(`
      CREATE TYPE settlement_status AS ENUM ('pending', 'processing', 'paid', 'cancelled')
    `);

    // Create settlements table
    await queryRunner.createTable(
      new Table({
        name: 'settlements',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'partyType',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'partyId',
            type: 'uuid',
          },
          {
            name: 'periodStart',
            type: 'timestamp with time zone',
          },
          {
            name: 'periodEnd',
            type: 'timestamp with time zone',
          },
          {
            name: 'totalSaleAmount',
            type: 'numeric',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalBaseAmount',
            type: 'numeric',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalCommissionAmount',
            type: 'numeric',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalMarginAmount',
            type: 'numeric',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'payableAmount',
            type: 'numeric',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'status',
            type: 'settlement_status',
            default: "'pending'",
          },
          {
            name: 'paidAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create indexes for settlements table
    await queryRunner.createIndex(
      'settlements',
      new TableIndex({
        name: 'IDX_SETTLEMENT_PARTY_TYPE_ID',
        columnNames: ['partyType', 'partyId'],
      })
    );

    await queryRunner.createIndex(
      'settlements',
      new TableIndex({
        name: 'IDX_SETTLEMENT_STATUS',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'settlements',
      new TableIndex({
        name: 'IDX_SETTLEMENT_PERIOD',
        columnNames: ['periodStart', 'periodEnd'],
      })
    );

    await queryRunner.createIndex(
      'settlements',
      new TableIndex({
        name: 'IDX_SETTLEMENT_CREATED_AT',
        columnNames: ['createdAt'],
      })
    );

    // Create foreign key for partyId -> users
    await queryRunner.createForeignKey(
      'settlements',
      new TableForeignKey({
        columnNames: ['partyId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Create settlement_items table
    await queryRunner.createTable(
      new Table({
        name: 'settlement_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'settlementId',
            type: 'uuid',
          },
          {
            name: 'orderId',
            type: 'uuid',
          },
          {
            name: 'orderItemId',
            type: 'uuid',
          },
          {
            name: 'productName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'quantity',
            type: 'integer',
          },
          {
            name: 'salePriceSnapshot',
            type: 'numeric',
            precision: 10,
            scale: 2,
          },
          {
            name: 'basePriceSnapshot',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'commissionAmountSnapshot',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'marginAmountSnapshot',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'totalSaleAmount',
            type: 'numeric',
            precision: 10,
            scale: 2,
          },
          {
            name: 'totalBaseAmount',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'sellerId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'supplierId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes for settlement_items table
    await queryRunner.createIndex(
      'settlement_items',
      new TableIndex({
        name: 'IDX_SETTLEMENT_ITEM_SETTLEMENT_ID',
        columnNames: ['settlementId'],
      })
    );

    await queryRunner.createIndex(
      'settlement_items',
      new TableIndex({
        name: 'IDX_SETTLEMENT_ITEM_ORDER_ID',
        columnNames: ['orderId'],
      })
    );

    await queryRunner.createIndex(
      'settlement_items',
      new TableIndex({
        name: 'IDX_SETTLEMENT_ITEM_ORDER_ITEM_ID',
        columnNames: ['orderItemId'],
      })
    );

    // Create foreign keys for settlement_items
    await queryRunner.createForeignKey(
      'settlement_items',
      new TableForeignKey({
        columnNames: ['settlementId'],
        referencedTableName: 'settlements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'settlement_items',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop settlement_items table (foreign keys will be dropped automatically)
    await queryRunner.dropTable('settlement_items', true);

    // Drop settlements table
    await queryRunner.dropTable('settlements', true);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS settlement_status`);
  }
}
