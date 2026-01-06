import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Phase 3-3: Add phone field to users table
 *
 * Purpose: Store user phone numbers collected during checkout
 * for auto-fill functionality in future orders
 */
export class AddPhoneToUsers1830000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add phone column to users table
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '20',
        isNullable: true,
        comment: 'Phone number for checkout auto-fill (Phase 3-3)'
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove phone column from users table
    await queryRunner.dropColumn('users', 'phone');
  }
}
