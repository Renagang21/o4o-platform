import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Phase PG-1: Add Toss Payments integration fields to orders table
 *
 * Adds the following fields:
 * - paymentKey: Toss payment transaction key
 * - paymentProvider: Payment gateway provider (default 'tosspayments')
 * - paidAt: Actual payment approval timestamp
 */
export class AddPaymentFieldsToOrders4000000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add paymentKey column
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'paymentKey',
        type: 'varchar',
        isNullable: true,
        comment: 'Toss Payments transaction key'
      })
    );

    // Add paymentProvider column
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'paymentProvider',
        type: 'varchar',
        default: "'tosspayments'",
        comment: 'Payment gateway provider'
      })
    );

    // Add paidAt column
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'paidAt',
        type: 'timestamp',
        isNullable: true,
        comment: 'Actual payment approval timestamp'
      })
    );

    console.log('✅ Added payment fields to orders table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns in reverse order
    await queryRunner.dropColumn('orders', 'paidAt');
    await queryRunner.dropColumn('orders', 'paymentProvider');
    await queryRunner.dropColumn('orders', 'paymentKey');

    console.log('✅ Removed payment fields from orders table');
  }
}
