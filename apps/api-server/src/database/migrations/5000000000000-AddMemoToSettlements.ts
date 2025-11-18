import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Phase SETTLE-ADMIN: Add memo field to settlements table
 *
 * Adds the following field:
 * - memo: Admin internal notes for settlement management
 */
export class AddMemoToSettlements5000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add memo column
    await queryRunner.addColumn(
      'settlements',
      new TableColumn({
        name: 'memo',
        type: 'text',
        isNullable: true,
        comment: 'Admin 내부용 메모'
      })
    );

    console.log('✅ Added memo field to settlements table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove memo column
    await queryRunner.dropColumn('settlements', 'memo');

    console.log('✅ Removed memo field from settlements table');
  }
}
