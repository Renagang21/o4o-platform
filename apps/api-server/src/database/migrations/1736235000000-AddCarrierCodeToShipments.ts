import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCarrierCodeToShipments1736235000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('shipments');
    if (table) {
      const carrierCodeColumn = table.columns.find(c => c.name === 'carrier_code');
      
      if (!carrierCodeColumn) {
        await queryRunner.addColumn('shipments', new TableColumn({
          name: 'carrier_code',
          type: 'varchar',
          length: '50',
          isNullable: true,
          comment: 'Carrier service code'
        }));
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('shipments');
    if (table) {
      const carrierCodeColumn = table.columns.find(c => c.name === 'carrier_code');
      if (carrierCodeColumn) {
        await queryRunner.dropColumn('shipments', 'carrier_code');
      }
    }
  }
}