import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

/**
 * Migration: Create Credit Tables
 *
 * WO-O4O-CREDIT-SYSTEM-V1
 * Creates credit_balances and credit_transactions tables for
 * the Neture Credit reward system.
 */
export class CreateCreditTables20260415260000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Create credit_balances table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'credit_balances',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'balance', type: 'integer', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'credit_balances',
      new TableIndex({
        name: 'IDX_credit_balances_user',
        columnNames: ['userId'],
        isUnique: true,
      }),
    );

    // ============================================
    // 2. Create credit_transactions table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'credit_transactions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'amount', type: 'integer' },
          { name: 'transactionType', type: 'varchar', length: '20', default: "'earn'" },
          { name: 'sourceType', type: 'varchar', length: '50' },
          { name: 'sourceId', type: 'uuid', isNullable: true },
          { name: 'referenceKey', type: 'varchar', length: '255', isNullable: true },
          { name: 'description', type: 'varchar', length: '500', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'credit_transactions',
      new TableIndex({
        name: 'IDX_credit_transactions_user',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'credit_transactions',
      new TableIndex({
        name: 'IDX_credit_transactions_user_created',
        columnNames: ['userId', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'credit_transactions',
      new TableIndex({
        name: 'IDX_credit_transactions_reference_key',
        columnNames: ['referenceKey'],
        isUnique: true,
        where: '"referenceKey" IS NOT NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('credit_transactions', true);
    await queryRunner.dropTable('credit_balances', true);
  }
}
