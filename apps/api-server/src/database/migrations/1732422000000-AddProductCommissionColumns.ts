import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductCommissionColumns1732422000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add Phase PD-2 commission columns to products table
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'commissionType',
        type: 'enum',
        enum: ['rate', 'fixed'],
        isNullable: true
      })
    );

    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'commissionValue',
        type: 'decimal',
        precision: 10,
        scale: 4,
        isNullable: true
      })
    );

    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'sellerCommissionRate',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true
      })
    );

    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'platformCommissionRate',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('products', 'platformCommissionRate');
    await queryRunner.dropColumn('products', 'sellerCommissionRate');
    await queryRunner.dropColumn('products', 'commissionValue');
    await queryRunner.dropColumn('products', 'commissionType');
  }
}
