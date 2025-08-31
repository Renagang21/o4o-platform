import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCarrierCodeToShipments1735635000000 implements MigrationInterface {
  name = 'AddCarrierCodeToShipments1735635000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'shipments',
      new TableColumn({
        name: 'carrier_code',
        type: 'varchar',
        length: '50',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('shipments', 'carrier_code');
  }
}