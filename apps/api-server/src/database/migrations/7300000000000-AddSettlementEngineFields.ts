import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * R-8-8-2: SettlementEngine v1 - Add fields for automatic settlement generation
 *
 * Adds the following fields to settlement_items:
 * - partyType: 'seller' | 'supplier' | 'platform' | 'partner'
 * - partyId: UUID reference to the party
 * - grossAmount: Total amount before commission
 * - netAmount: Amount after commission deduction
 * - reasonCode: Reason for settlement item creation
 *
 * Also updates settlements.partyType to include 'partner'
 */
export class AddSettlementEngineFields7300000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to settlement_items
    await queryRunner.addColumn(
      'settlement_items',
      new TableColumn({
        name: 'partyType',
        type: 'varchar',
        length: '20',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'settlement_items',
      new TableColumn({
        name: 'partyId',
        type: 'uuid',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'settlement_items',
      new TableColumn({
        name: 'grossAmount',
        type: 'numeric',
        precision: 10,
        scale: 2,
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'settlement_items',
      new TableColumn({
        name: 'netAmount',
        type: 'numeric',
        precision: 10,
        scale: 2,
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'settlement_items',
      new TableColumn({
        name: 'reasonCode',
        type: 'varchar',
        length: '50',
        isNullable: true,
      })
    );

    // Update settlements.partyType to include 'partner'
    // Note: Since it's a varchar column, no schema change needed
    // The validation is handled at the application level
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from settlement_items
    await queryRunner.dropColumn('settlement_items', 'reasonCode');
    await queryRunner.dropColumn('settlement_items', 'netAmount');
    await queryRunner.dropColumn('settlement_items', 'grossAmount');
    await queryRunner.dropColumn('settlement_items', 'partyId');
    await queryRunner.dropColumn('settlement_items', 'partyType');
  }
}
